import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import type { FetchLike } from "../src/quota/fetch"
import { hourStartUtc, sampleQuota } from "../src/quota/sample"

const HOME = "/home/synthetic"
const NOW = Date.parse("2026-11-27T14:26:00.000Z")
const CLAUDE_PATH = join(HOME, ".claude/.credentials.json")
const OPENCODE_PATH = join(HOME, ".local/share/opencode/auth.json")
const CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
const OPENCODE_URL = "https://opencode.ai/inference/go/v1/usage"
const CLAUDE_TOKEN = "synthetic-claude-token"

const CLAUDE_BODY = {
	five_hour: { utilization: 23, resets_at: "2026-11-27T14:20:00.160769+00:00" },
	seven_day: { utilization: 31, resets_at: "2026-11-30T08:00:00.160792+00:00" },
	seven_day_opus: null,
}

const OPENCODE_BODY = {
	usage: {
		rolling: { status: "ok", percent: 4, resetsAt: "2026-11-27T14:26:54.000Z" },
		weekly: { status: "ok", percent: 55, resetsAt: "2026-11-30T00:00:00.000Z" },
		monthly: { status: "ok", percent: 27, resetsAt: "2026-12-25T11:51:02.000Z" },
	},
}

type Reply = { status?: number; body: unknown } | Error

function credentialFiles(expiresAt = NOW + 60_000): Record<string, string> {
	return {
		[CLAUDE_PATH]: JSON.stringify({ claudeAiOauth: { accessToken: CLAUDE_TOKEN, expiresAt } }),
		[OPENCODE_PATH]: JSON.stringify({ "opencode-go": { key: "synthetic-opencode-key" } }),
	}
}

function fakeFetch(replies: Record<string, Reply>) {
	const calls: { url: string; headers: Record<string, string> }[] = []
	const fetch: FetchLike = async (url, init) => {
		calls.push({ url, headers: init.headers })
		const reply = replies[url]
		if (reply instanceof Error) throw reply
		const status = reply?.status ?? 200
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => reply?.body,
		}
	}
	return { calls, fetch }
}

function makeDeps(fetch: FetchLike, files: Record<string, string> = credentialFiles()) {
	const logs: string[] = []
	return {
		logs,
		deps: {
			home: HOME,
			nowMs: NOW,
			fetch,
			readText: (path: string) => files[path] ?? null,
			log: (line: string) => logs.push(line),
		},
	}
}

describe("sampleQuota", () => {
	test("stamps both plans at the start of the current UTC hour", async () => {
		const { calls, fetch } = fakeFetch({
			[CLAUDE_URL]: { body: CLAUDE_BODY },
			[OPENCODE_URL]: { body: OPENCODE_BODY },
		})
		const { deps, logs } = makeDeps(fetch)
		const rows = await sampleQuota(deps)

		expect(rows).toHaveLength(5)
		expect(new Set(rows.map((row) => row.sampledAt))).toEqual(new Set(["2026-11-27T14:00:00.000Z"]))
		expect(calls.find((call) => call.url === CLAUDE_URL)?.headers["Authorization"]).toBe(
			`Bearer ${CLAUDE_TOKEN}`,
		)
		expect(calls.find((call) => call.url === CLAUDE_URL)?.headers["anthropic-beta"]).toBe(
			"oauth-2025-04-20",
		)
		expect(calls.find((call) => call.url === OPENCODE_URL)?.headers["Authorization"]).toBe(
			"Bearer synthetic-opencode-key",
		)
		expect(logs).toEqual([])
	})

	test("skips an expired Claude token without calling Claude or printing it", async () => {
		const { calls, fetch } = fakeFetch({ [OPENCODE_URL]: { body: OPENCODE_BODY } })
		const { deps, logs } = makeDeps(fetch, credentialFiles(NOW - 1))
		const rows = await sampleQuota(deps)

		expect(rows).toHaveLength(3)
		expect(calls.map((call) => call.url)).toEqual([OPENCODE_URL])
		expect(logs).toHaveLength(1)
		expect(logs[0]).toContain("claude")
		expect(logs[0]).toContain("expired")
		expect(logs.join("\n")).not.toContain(CLAUDE_TOKEN)
	})

	test("skips missing credential files without any request", async () => {
		const fetch: FetchLike = async () => {
			throw new Error("no request expected")
		}
		const { deps, logs } = makeDeps(fetch, {})
		const rows = await sampleQuota(deps)

		expect(rows).toEqual([])
		expect(logs).toHaveLength(2)
		expect(logs.every((line) => line.includes("not found"))).toBe(true)
	})

	test("logs one line naming the plan and status on a failed request", async () => {
		const { fetch } = fakeFetch({
			[CLAUDE_URL]: { status: 500, body: { error: "synthetic" } },
			[OPENCODE_URL]: { body: OPENCODE_BODY },
		})
		const { deps, logs } = makeDeps(fetch)
		const rows = await sampleQuota(deps)

		expect(rows).toHaveLength(3)
		expect(logs).toHaveLength(1)
		expect(logs[0]).toContain("claude")
		expect(logs[0]).toContain("HTTP 500")
	})

	test("logs one line and yields no Claude rows on an unexpected body", async () => {
		const { fetch } = fakeFetch({
			[CLAUDE_URL]: { body: { unexpected: true } },
			[OPENCODE_URL]: { body: OPENCODE_BODY },
		})
		const { deps, logs } = makeDeps(fetch)
		const rows = await sampleQuota(deps)

		expect(rows).toHaveLength(3)
		expect(logs).toHaveLength(1)
		expect(logs[0]).toContain("unexpected body (HTTP 200)")
	})

	test("never throws when both requests fail", async () => {
		const { fetch } = fakeFetch({
			[CLAUDE_URL]: new Error("synthetic network failure"),
			[OPENCODE_URL]: new Error("synthetic network failure"),
		})
		const { deps, logs } = makeDeps(fetch)
		const rows = await sampleQuota(deps)

		expect(rows).toEqual([])
		expect(logs).toHaveLength(2)
		expect(logs.every((line) => line.includes("request failed"))).toBe(true)
	})
})

describe("hourStartUtc", () => {
	test("floors to the UTC hour", () => {
		expect(hourStartUtc(NOW)).toBe("2026-11-27T14:00:00.000Z")
	})
})
