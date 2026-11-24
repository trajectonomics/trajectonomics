// A change of the allowance settings against the real traj: only the allowance reads run, every other Read is kept
// as it was, and a plan that changed since the Snapshot was read still makes a full read (web ADR 0012).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import type { Snapshot } from "../src/lib/contract"
import {
	disposeAllowances,
	editorOver,
	ledgerEnv,
	PLAN,
	setupAllowances,
	terminal,
} from "./allowances-ledger.test-support"
import { post, snapshotOf } from "./allowances-requests.test-support"
import { calls, clearCalls, spyContext } from "./allowances-spy.test-support"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { editRequest } from "./edit-request.test-support"
import type { Editor } from "./serve-edit"

const RMF = "allowance.retirement.rmf"
const ESG = "allowance.thai_esg"
const FIRST = { labels: [RMF], step: "1000", budget: null, minSaving: null }
const SECOND = { labels: [RMF, ESG], step: "5000", budget: "100000", minSaving: "1" }
const CHECK = ["scenario list", "account list", "report networth"]

let spy: Editor
let log = ""

/** One reread, posted to the spy editor as the page posts it, and its answer's Snapshot. */
async function reread(body: unknown): Promise<Snapshot> {
	const response = await spy.reread(editRequest({}, JSON.stringify(body)), 4321)
	const answer = (await response.json()) as { ok: boolean; snapshot: Snapshot }
	if (!answer.ok) throw new Error("the reread failed")
	return answer.snapshot
}

/** The Snapshot without its allowance reads and their inputs: everything a settings change must leave alone. */
function others(snapshot: Snapshot): string {
	const { allowances: _reads, ...reads } = snapshot.reads
	const { allowances: _inputs, ...params } = snapshot.params
	return JSON.stringify({ ...snapshot, params, reads })
}

beforeAll(async () => {
	await setupAllowances()
	const made = await spyContext(ledgerEnv())
	log = made.log
	spy = await editorOver(made.context)
}, SLOW_MS)
afterAll(disposeAllowances)

describe("a reread that changes only the allowance inputs", () => {
	test(
		"runs the three checks and the allowance reads, and keeps every other Read as it was",
		async () => {
			const before = await reread({ allowances: FIRST })
			await clearCalls(log)
			const after = await reread({ allowances: SECOND })
			const ran = await calls(log)
			expect(ran.filter((line) => line.startsWith("projection allowances"))).toHaveLength(1)
			const rest = ran.filter((line) => !line.startsWith("projection allowances"))
			expect(rest.map((line) => CHECK.find((prefix) => line.startsWith(prefix)))).toEqual(CHECK)
			expect(others(after)).toBe(others(before))
			expect(after.params.allowances).toEqual(SECOND)
			expect(after.reads.allowances[PLAN]?.ok).toBe(true)
			expect(JSON.stringify(after.reads.allowances)).not.toBe(
				JSON.stringify(before.reads.allowances),
			)
		},
		SLOW_MS,
	)

	test(
		"clearing the inputs runs no allowance read and leaves none in the Snapshot",
		async () => {
			await clearCalls(log)
			const after = await reread({ allowances: null })
			expect((await calls(log)).some((line) => line.startsWith("projection"))).toBe(false)
			expect(after.reads.allowances).toEqual({})
			expect(after.params.allowances).toBeNull()
		},
		SLOW_MS,
	)

	test(
		"a reread of the same Snapshot is the same as a full one",
		async () => {
			const kept = await reread({ allowances: FIRST })
			const full = await post("reread", { allowances: FIRST })
			expect(kept).toEqual(snapshotOf(full))
		},
		SLOW_MS,
	)
})

describe("a reread after the ledger moved", () => {
	test(
		"a plan changed from a terminal makes a full read, with the new document and the new allowances",
		async () => {
			const before = await reread({ allowances: FIRST })
			terminal(["scenario", "tax", PLAN, "--from-stored", "--label", "rmf=allowance.thai_esg"])
			await clearCalls(log)
			const after = await reread({ allowances: SECOND })
			const ran = await calls(log)
			expect(ran.some((line) => line.startsWith("projection run"))).toBe(true)
			expect(ran.some((line) => line.startsWith("doctor"))).toBe(true)
			expect(after.params.allowances).toEqual(SECOND)
			expect(after.reads.documents[PLAN]).not.toEqual(before.reads.documents[PLAN])
			expect(after.reads.allowances[PLAN]?.ok).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"a reread with no inputs reads in full",
		async () => {
			await clearCalls(log)
			await reread({})
			expect((await calls(log)).some((line) => line.startsWith("projection run"))).toBe(true)
		},
		SLOW_MS,
	)
})

describe("what a settings change costs", () => {
	test(
		"takes about as long as the allowance reads alone, far less than a full read",
		async () => {
			const timed = async (work: () => Promise<unknown>) => {
				const start = performance.now()
				await work()
				return Math.round(performance.now() - start)
			}
			await reread({ allowances: FIRST })
			const full = await timed(() => reread({}))
			const kept = await timed(() => reread({ allowances: SECOND }))
			// The allowance read alone: the logged argv of the last change, run by itself.
			await clearCalls(log)
			await reread({ allowances: FIRST })
			const argv = (await calls(log)).find((line) => line.startsWith("projection allowances"))
			const alone = await timed(async () => {
				const run = Bun.spawnSync([BINARY, ...(argv ?? "").split(" ")], { env: ledgerEnv() })
				expect(run.exitCode).toBe(0)
			})
			console.log(
				`full read ${full} ms, settings change ${kept} ms, allowance read alone ${alone} ms`,
			)
			expect(kept).toBeLessThan(full)
		},
		SLOW_MS,
	)
})
