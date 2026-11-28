import { describe, expect, test } from "bun:test"
import { type FetchLike, formatIngestFailure, sendRows } from "../src/send/client"
import { usageRow } from "./support/rows"

const URL = "https://synthetic.test/data/ingest"
const BEARER = "synthetic-ingest-bearer"

type Reply = { status: number; body: unknown; jsonThrows?: boolean } | Error

function fakeFetch(reply: Reply) {
	const calls: { url: string; init: { headers: Record<string, string>; body: string } }[] = []
	const fetch: FetchLike = async (url, init) => {
		calls.push({ url, init })
		if (reply instanceof Error) throw reply
		return {
			ok: reply.status >= 200 && reply.status < 300,
			status: reply.status,
			json: async () => {
				if (reply.jsonThrows) throw new Error("synthetic body")
				return reply.body
			},
		}
	}
	return { calls, fetch }
}

function makeConfig(fetch: FetchLike) {
	const logs: string[] = []
	return {
		logs,
		config: { url: URL, bearer: BEARER, fetch, log: (line: string) => logs.push(line) },
	}
}

describe("sendRows", () => {
	test("posts one authenticated batch and reports it accepted", async () => {
		const { calls, fetch } = fakeFetch({ status: 200, body: { accepted: 2 } })
		const { config, logs } = makeConfig(fetch)
		const report = await sendRows([usageRow(), usageRow({ model: "claude-other" })], config)

		expect(report.ok).toBe(true)
		expect(report.batches).toHaveLength(1)
		expect(calls[0]?.url).toBe(URL)
		expect(calls[0]?.init.headers["Authorization"]).toBe(`Bearer ${BEARER}`)
		expect(JSON.parse(calls[0]?.init.body ?? "{}").usage).toHaveLength(2)
		expect(logs).toContain("send: accepted 2/2 row(s) in 1 batch(es)")
	})

	test("logs the status and error codes without the key", async () => {
		const body = {
			error: "invalid_batch",
			errors: [
				{ path: "usage[0].plan", code: "PLAN_UNKNOWN" },
				{ path: "usage[1].machine", code: "MACHINE_ALIAS_INVALID" },
				{ path: "usage[2].plan", code: "PLAN_UNKNOWN" },
			],
		}
		const { fetch } = fakeFetch({ status: 400, body })
		const { config, logs } = makeConfig(fetch)
		const report = await sendRows([usageRow()], config)

		expect(report.ok).toBe(false)
		expect(logs).toHaveLength(2)
		expect(logs[0]).toBe("send: HTTP 400 invalid_batch: PLAN_UNKNOWN, MACHINE_ALIAS_INVALID")
		expect(logs.join("\n")).not.toContain(BEARER)
	})

	test("formats a response with no error codes", () => {
		expect(formatIngestFailure(401, { error: "unauthorized" })).toBe("send: HTTP 401 unauthorized")
		expect(formatIngestFailure(500, null)).toBe("send: HTTP 500")
	})

	test("logs a body that is not JSON", async () => {
		const { fetch } = fakeFetch({ status: 500, body: null, jsonThrows: true })
		const { config, logs } = makeConfig(fetch)
		const report = await sendRows([usageRow()], config)

		expect(report.ok).toBe(false)
		expect(logs[0]).toBe("send: HTTP 500")
	})

	test("reports a failed request without retrying", async () => {
		const { calls, fetch } = fakeFetch(new Error("synthetic network failure"))
		const { config, logs } = makeConfig(fetch)
		const report = await sendRows([usageRow()], config)

		expect(report.ok).toBe(false)
		expect(calls).toHaveLength(1)
		expect(logs[0]).toBe("send: request failed: synthetic network failure")
	})

	test("sends nothing when there are no rows", async () => {
		const { calls, fetch } = fakeFetch({ status: 200, body: {} })
		const { config } = makeConfig(fetch)
		const report = await sendRows([], config)

		expect(report).toEqual({ ok: true, batches: [] })
		expect(calls).toHaveLength(0)
	})
})
