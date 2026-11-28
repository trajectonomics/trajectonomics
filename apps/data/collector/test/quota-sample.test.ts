import { describe, expect, test } from "bun:test"
import type { FetchLike } from "../src/quota/fetch"
import { hourStartUtc, sampleQuota } from "../src/quota/sample"
import {
	ANTIGRAVITY_BODY,
	ANTIGRAVITY_TOKEN,
	ANTIGRAVITY_URL,
	CLAUDE_BODY,
	CLAUDE_TOKEN,
	CLAUDE_URL,
	CURSOR_BODY,
	CURSOR_TOKEN,
	CURSOR_URL,
	credentialFiles,
	fakeFetch,
	makeDeps,
	NOW,
	OPENCODE_BODY,
	OPENCODE_URL,
} from "./support/quota-sample"

describe("sampleQuota", () => {
	test("stamps all five plans and sends expected headers, bodies and signals", async () => {
		const { calls, fetch } = fakeFetch({
			[CLAUDE_URL]: { body: CLAUDE_BODY },
			[OPENCODE_URL]: { body: OPENCODE_BODY },
			[ANTIGRAVITY_URL]: { body: ANTIGRAVITY_BODY },
			[CURSOR_URL]: { body: CURSOR_BODY },
		})
		const { deps, logs } = makeDeps(fetch)
		const rows = await sampleQuota(deps)
		expect(rows).toHaveLength(10)
		expect(new Set(rows.map((row) => row.sampledAt))).toEqual(new Set(["2026-11-27T14:00:00.000Z"]))
		const byUrl = new Map(calls.map((c) => [c.url, c.init]))
		expect(byUrl.get(CLAUDE_URL)?.headers["Authorization"]).toBe(`Bearer ${CLAUDE_TOKEN}`)
		expect(byUrl.get(CLAUDE_URL)?.headers["anthropic-beta"]).toBe("oauth-2025-04-20")
		expect(byUrl.get(OPENCODE_URL)?.headers["Authorization"]).toBe("Bearer synthetic-opencode-key")
		expect(byUrl.get(ANTIGRAVITY_URL)?.headers["Authorization"]).toBe(`Bearer ${ANTIGRAVITY_TOKEN}`)
		expect(byUrl.get(ANTIGRAVITY_URL)?.body).toBe("{}")
		expect(byUrl.get(CURSOR_URL)?.headers["Authorization"]).toBe(`Bearer ${CURSOR_TOKEN}`)
		expect(calls.every((c) => c.init.signal !== undefined)).toBe(true)
		expect([...logs].sort()).toEqual(
			[
				"quota: claude sampled 2 rows",
				"quota: opencode-go sampled 3 rows",
				"quota: antigravity sampled 2 rows",
				"quota: cursor sampled 1 rows",
				"quota: meta sampled 2 rows",
			].sort(),
		)
	})

	test("skips expired tokens without calling their endpoints or printing them", async () => {
		const { calls, fetch } = fakeFetch({ [OPENCODE_URL]: { body: OPENCODE_BODY } })
		const { deps, logs } = makeDeps(fetch, credentialFiles(NOW - 60_000), async () => null)
		expect(await sampleQuota(deps)).toHaveLength(3)
		expect(calls.map((call) => call.url)).toEqual([OPENCODE_URL])
		expect(logs.filter((line) => line.includes("expired"))).toHaveLength(3)
		expect(logs.some((line) => line.startsWith("quota: antigravity sampled"))).toBe(false)
		expect(logs.join("\n")).not.toContain(CLAUDE_TOKEN)
		expect(logs.join("\n")).not.toContain(ANTIGRAVITY_TOKEN)
		expect(logs.join("\n")).not.toContain(CURSOR_TOKEN)
	})

	test("logs Muse's empty window as no reading rather than unexpected output", async () => {
		const fetch: FetchLike = async () => {
			throw new Error("no request expected")
		}
		const noUsage = JSON.stringify({
			allowance: null,
			hint: "No usage in the current window.",
			reason: "server_sent_no_usage",
			schemaVersion: 1,
		})
		const { deps, logs } = makeDeps(fetch, {}, async () => ({ exitCode: 0, stdout: noUsage }))
		expect(await sampleQuota(deps)).toEqual([])
		expect(logs).toContain("quota: meta no reading (no usage yet in this window)")
		expect(logs.some((line) => line.includes("unexpected output"))).toBe(false)
	})

	test("skips missing files and unavailable muse binary without any request", async () => {
		const fetch: FetchLike = async () => {
			throw new Error("no request expected")
		}
		const { deps, logs } = makeDeps(fetch, {}, async () => null)
		expect(await sampleQuota(deps)).toEqual([])
		expect(logs).toHaveLength(5)
		expect(logs.filter((line) => line.includes("not found"))).toHaveLength(4)
		expect(logs.some((line) => line.includes("meta") && line.includes("unavailable"))).toBe(true)
	})

	test("logs one line on HTTP failure, command failure, or unexpected output", async () => {
		const { fetch } = fakeFetch({
			[CLAUDE_URL]: { status: 500, body: {} },
			[OPENCODE_URL]: { body: OPENCODE_BODY },
			[ANTIGRAVITY_URL]: { body: { groups: [] } },
			[CURSOR_URL]: new Error("synthetic"),
		})
		const { deps, logs } = makeDeps(fetch, credentialFiles(), async () => ({
			exitCode: 1,
			stdout: "",
		}))
		expect(await sampleQuota(deps)).toHaveLength(3)
		expect(logs).toHaveLength(5)
		expect(logs).toContain("quota: opencode-go sampled 3 rows")
		expect(logs.some((l) => l.includes("claude") && l.includes("HTTP 500"))).toBe(true)
		expect(logs.some((l) => l.includes("antigravity") && l.includes("unexpected body"))).toBe(true)
		expect(logs.some((l) => l.includes("cursor") && l.includes("request failed"))).toBe(true)
		expect(logs.some((l) => l.includes("meta") && l.includes("exit 1"))).toBe(true)
	})
})

describe("hourStartUtc", () => {
	test("floors to the UTC hour", () => {
		expect(hourStartUtc(NOW)).toBe("2026-11-27T14:00:00.000Z")
	})
})
