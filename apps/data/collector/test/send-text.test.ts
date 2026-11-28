import { describe, expect, test } from "bun:test"
import { sendText } from "../src/send"
import type { FetchLike } from "../src/send/client"
import { quotaRow, usageRow } from "./support/rows"

const URL = "https://synthetic.test/data/ingest"

function fakeFetch() {
	const bodies: string[] = []
	const fetch: FetchLike = async (_url, init) => {
		bodies.push(init.body)
		return { ok: true, status: 200, json: async () => ({ accepted: 1 }) }
	}
	return { bodies, fetch }
}

function makeConfig(fetch: FetchLike) {
	const logs: string[] = []
	return {
		logs,
		config: { url: URL, bearer: "synthetic-bearer", fetch, log: (line: string) => logs.push(line) },
	}
}

describe("sendText", () => {
	test("parses both row kinds, strips kind, and drops unknown plans", async () => {
		const text = [
			JSON.stringify(usageRow()),
			JSON.stringify({ kind: "quota", ...quotaRow() }),
			JSON.stringify(usageRow({ plan: "unknown" })),
		].join("\n")
		const { bodies, fetch } = fakeFetch()
		const { config, logs } = makeConfig(fetch)
		const report = await sendText(text, config)

		expect(report.ok).toBe(true)
		const body = JSON.parse(bodies[0] ?? "{}") as {
			usage: Record<string, unknown>[]
			quota: Record<string, unknown>[]
		}
		expect(body.usage).toEqual([usageRow()])
		expect(body.quota).toEqual([quotaRow()])
		expect(body.quota[0]?.["kind"]).toBeUndefined()
		expect(logs).toContain("send: dropped 1 row(s) with plan unknown")
	})

	test("rejects a malformed line before any request", async () => {
		const { bodies, fetch } = fakeFetch()
		const { config } = makeConfig(fetch)

		await expect(sendText("{", config)).rejects.toThrow("line 1 is not JSON")
		expect(bodies).toHaveLength(0)
	})

	test("posts without following redirects and with a timeout", async () => {
		const inits: Parameters<FetchLike>[1][] = []
		const fetch: FetchLike = async (_url, init) => {
			inits.push(init)
			return { ok: true, status: 200, json: async () => ({ accepted: 1 }) }
		}
		const { config } = makeConfig(fetch)
		await sendText(JSON.stringify(usageRow()), config)

		expect(inits).toHaveLength(1)
		expect(inits[0]!.redirect).toBe("error")
		expect(inits[0]!.signal).toBeInstanceOf(AbortSignal)
	})
})
