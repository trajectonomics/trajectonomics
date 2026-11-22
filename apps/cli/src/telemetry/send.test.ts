import { describe, expect, it } from "bun:test"
import { NOTICE, POSTHOG_URL, type RunRecord, usageEvent } from "./event"
import { isUsageBody, postEvent } from "./post"
import { type AfterRunInput, afterRun } from "./send"
import type { TelemetryState } from "./state"

const ID = "0194b000-0000-7000-8000-00000000000a"
const RECORD: RunRecord = { command: "balance", exitCode: 0, format: "human" }

/** A run whose every I/O is recorded, so a test can say what happened and what did not. */
function harness(overrides: Partial<AfterRunInput> & { state?: TelemetryState } = {}) {
	const calls = {
		spawned: [] as string[],
		notices: [] as string[],
		written: [] as TelemetryState[],
	}
	let state: TelemetryState = overrides.state ?? { enabled: true }
	const input: AfterRunInput = {
		record: RECORD,
		env: {},
		version: "0.5.0",
		platform: "linux",
		arch: "x64",
		now: () => "2026-11-22T10:00:00.000Z",
		newUuid: () => ID,
		readState: () => state,
		writeState: (next) => {
			state = next
			calls.written.push(next)
			return true
		},
		spawnSender: (body) => calls.spawned.push(body),
		notice: (text) => calls.notices.push(text),
		...overrides,
	}
	return { input, calls, state: () => state }
}

describe("afterRun", () => {
	it("sends one event, creates the id, and shows the notice once on a successful run", () => {
		const { input, calls, state } = harness()
		afterRun(input)
		expect(calls.spawned).toHaveLength(1)
		const body = JSON.parse(calls.spawned[0] ?? "")
		expect(body).toMatchObject({ event: "traj_command_run", distinct_id: ID })
		expect(calls.notices).toEqual([NOTICE])
		expect(state()).toEqual({ enabled: true, id: ID, noticeShown: true })
	})

	it("does nothing at all when counting is off", () => {
		const { input, calls } = harness({ state: { enabled: false } })
		afterRun(input)
		expect(calls.spawned).toEqual([])
		expect(calls.notices).toEqual([])
		expect(calls.written).toEqual([])
	})

	it("does nothing for a development build, whatever the state file says", () => {
		const { input, calls } = harness({ version: "0.0.0" })
		afterRun(input)
		expect(calls.spawned).toEqual([])
		expect(calls.written).toEqual([])
	})

	it("sends without the notice on a failed run, and keeps the notice for a later success", () => {
		const failing = harness({ record: { command: "balance", exitCode: 2, format: "json" } })
		afterRun(failing.input)
		expect(failing.calls.spawned).toHaveLength(1)
		expect(failing.calls.notices).toEqual([])
		expect(failing.state()).toEqual({ enabled: true, id: ID })
	})

	it("does not repeat the notice once it has been shown", () => {
		const { input, calls } = harness({ state: { enabled: true, id: ID, noticeShown: true } })
		afterRun(input)
		expect(calls.spawned).toHaveLength(1)
		expect(calls.notices).toEqual([])
		expect(calls.written).toEqual([])
	})

	it("keeps an existing id instead of replacing it", () => {
		const { input, calls } = harness({ state: { enabled: true, id: ID, noticeShown: true } })
		afterRun({ ...input, newUuid: () => "0194b000-0000-7000-8000-00000000ffff" })
		expect(JSON.parse(calls.spawned[0] ?? "").distinct_id).toBe(ID)
	})

	it("swallows every failure, so the command's result is unchanged", () => {
		const { input } = harness({
			readState: () => {
				throw new Error("disk gone")
			},
		})
		expect(() => afterRun(input)).not.toThrow()
		const { input: failingSpawn } = harness({
			spawnSender: () => {
				throw new Error("no spawn")
			},
		})
		expect(() => afterRun(failingSpawn)).not.toThrow()
	})

	it("sends nothing and prints nothing when a new id cannot be saved", () => {
		const refused = harness({ writeState: () => false })
		afterRun(refused.input)
		expect(refused.calls.spawned).toEqual([])
		expect(refused.calls.notices).toEqual([])
		const throwing = harness({
			writeState: () => {
				throw new Error("read-only")
			},
		})
		afterRun(throwing.input)
		expect(throwing.calls.spawned).toEqual([])
		expect(throwing.calls.notices).toEqual([])
	})

	it("never writes back over a traj telemetry off that finished during the run", () => {
		let reads = 0
		const written: TelemetryState[] = []
		const { input, calls } = harness({
			// The first read sees counting on; by the time the run saves its id, `off` has landed.
			readState: () => (reads++ === 0 ? { enabled: true } : { enabled: false }),
			writeState: (next) => {
				written.push(next)
				return true
			},
		})
		afterRun(input)
		expect(written).toEqual([])
		expect(calls.spawned).toEqual([])
	})

	it("still sends under a saved id when only the notice flag cannot be saved", () => {
		const { input, calls } = harness({ state: { enabled: true, id: ID }, writeState: () => false })
		afterRun(input)
		expect(calls.spawned).toHaveLength(1)
		expect(calls.notices).toEqual([NOTICE])
	})
})

/** A body exactly as `afterRun` would hand it to the sender. */
const BODY = JSON.stringify(
	usageEvent({
		id: ID,
		record: { command: "tx add", exitCode: 2, errorCode: "invalid_input", format: "json" },
		version: "0.5.0",
		platform: "linux",
		arch: "x64",
		timestamp: "2026-11-22T10:00:00.000Z",
		uuid: ID,
	}),
)

describe("isUsageBody", () => {
	it("accepts a body usageEvent made", () => {
		expect(isUsageBody(BODY)).toBe(true)
	})

	it("refuses an extra property, another key, another event, or a command with user text", () => {
		const event = JSON.parse(BODY)
		const variants = [
			{ ...event, properties: { ...event.properties, path: "/home/u/.traj" } },
			{ ...event, api_key: "phc_someone_else" },
			{ ...event, event: "something_else" },
			{ ...event, properties: { ...event.properties, command: "tx add 1500 THB" } },
			{ ...event, extra: true },
		]
		for (const variant of variants) expect(isUsageBody(JSON.stringify(variant))).toBe(false)
		expect(isUsageBody("not json")).toBe(false)
	})
})

describe("postEvent", () => {
	it("posts a usage event to the EU endpoint as JSON", async () => {
		const requests: { url: string; init: RequestInit }[] = []
		const body = BODY
		await postEvent(body, (async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} })
			return new Response("{}")
		}) as unknown as typeof fetch)
		expect(requests).toHaveLength(1)
		expect(requests[0]?.url).toBe(POSTHOG_URL)
		expect(requests[0]?.init.method).toBe("POST")
		expect(requests[0]?.init.body).toBe(body)
	})

	it("drops a body that is not a usage event, without posting it", async () => {
		let posted = false
		const fetcher = (async () => {
			posted = true
			return new Response("")
		}) as unknown as typeof fetch
		await postEvent(JSON.stringify({ event: "something_else" }), fetcher)
		await postEvent("not json", fetcher)
		expect(posted).toBe(false)
	})

	it("swallows a failed request", async () => {
		const fetcher = (async () => {
			throw new Error("offline")
		}) as unknown as typeof fetch
		await expect(postEvent(BODY, fetcher)).resolves.toBeUndefined()
	})
})
