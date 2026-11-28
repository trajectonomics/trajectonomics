import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import type { FetchInit, FetchLike } from "../src/quota/fetch"
import { type CommandRunner, hourStartUtc, sampleQuota } from "../src/quota/sample"

const HOME = "/home/synthetic"
const NOW = Date.parse("2026-11-27T14:26:00.000Z")
const CLAUDE_PATH = join(HOME, ".claude/.credentials.json")
const OPENCODE_PATH = join(HOME, ".local/share/opencode/auth.json")
const CURSOR_PATH = join(HOME, ".config/cursor/auth.json")
const ANTIGRAVITY_PATH = join(HOME, ".gemini/antigravity/antigravity-oauth-token")
const CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
const OPENCODE_URL = "https://opencode.ai/inference/go/v1/usage"
const ANTIGRAVITY_URL =
	"https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary"
const CURSOR_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
const CLAUDE_TOKEN = "synthetic-claude-token"
const ANTIGRAVITY_TOKEN = "synthetic-antigravity-token"

function syntheticJwt(expSeconds: number): string {
	const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url")
	const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url")
	return `${header}.${payload}.sig`
}

const CURSOR_TOKEN = syntheticJwt(Math.floor((NOW + 60_000) / 1000))
const CLAUDE_BODY = {
	five_hour: { utilization: 23, resets_at: "2026-11-27T14:20:00.160769+00:00" },
	seven_day: { utilization: 31, resets_at: "2026-11-30T08:00:00.160792+00:00" },
}
const OPENCODE_BODY = {
	usage: {
		rolling: { percent: 4, resetsAt: "2026-11-27T14:26:54.000Z" },
		weekly: { percent: 55, resetsAt: "2026-11-30T00:00:00.000Z" },
		monthly: { percent: 27, resetsAt: "2026-12-25T11:51:02.000Z" },
	},
}
const ANTIGRAVITY_BODY = {
	groups: [
		{
			buckets: [
				{ bucketId: "gemini-5h", window: "5h", remainingFraction: 0.9 },
				{ bucketId: "gemini-weekly", window: "weekly", remainingFraction: 0.75 },
			],
		},
	],
}
const CURSOR_BODY = {
	billingCycleEnd: String(Date.parse("2026-12-01T00:00:00.000Z")),
	planUsage: { totalPercentUsed: 20 },
}
const MUSE_STDOUT = JSON.stringify({
	allowance: {
		window: { usedPercent: 10, resetsAtMs: Date.parse("2026-11-27T18:00:00.000Z") },
		weekly: { usedPercent: 30, resetsAtMs: Date.parse("2026-12-01T00:00:00.000Z") },
	},
})

type Reply = { status?: number; body: unknown } | Error

function credentialFiles(expiresAt = NOW + 60_000): Record<string, string> {
	return {
		[CLAUDE_PATH]: JSON.stringify({ claudeAiOauth: { accessToken: CLAUDE_TOKEN, expiresAt } }),
		[OPENCODE_PATH]: JSON.stringify({ "opencode-go": { key: "synthetic-opencode-key" } }),
		[ANTIGRAVITY_PATH]: JSON.stringify({
			token: { access_token: ANTIGRAVITY_TOKEN, expiry: new Date(expiresAt).toISOString() },
		}),
		[CURSOR_PATH]: JSON.stringify({ accessToken: syntheticJwt(Math.floor(expiresAt / 1000)) }),
	}
}

function fakeFetch(replies: Record<string, Reply>) {
	const calls: { url: string; init: FetchInit }[] = []
	const fetch: FetchLike = async (url, init) => {
		calls.push({ url, init })
		const reply = replies[url]
		if (reply instanceof Error) throw reply
		const status = reply?.status ?? 200
		return { ok: status >= 200 && status < 300, status, json: async () => reply?.body }
	}
	return { calls, fetch }
}

function makeDeps(
	fetch: FetchLike,
	files: Record<string, string> = credentialFiles(),
	runCommand: CommandRunner = async () => ({ exitCode: 0, stdout: MUSE_STDOUT }),
) {
	const logs: string[] = []
	return {
		logs,
		deps: {
			home: HOME,
			nowMs: NOW,
			fetch,
			readText: (path: string) => files[path] ?? null,
			log: (line: string) => logs.push(line),
			antigravityTokenPath: () => (files[ANTIGRAVITY_PATH] ? ANTIGRAVITY_PATH : null),
			runCommand,
		},
	}
}

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
		expect(logs).toEqual([])
	})

	test("skips expired tokens without calling their endpoints or printing them", async () => {
		const { calls, fetch } = fakeFetch({ [OPENCODE_URL]: { body: OPENCODE_BODY } })
		const { deps, logs } = makeDeps(fetch, credentialFiles(NOW - 60_000), async () => null)
		expect(await sampleQuota(deps)).toHaveLength(3)
		expect(calls.map((call) => call.url)).toEqual([OPENCODE_URL])
		expect(logs.filter((line) => line.includes("expired"))).toHaveLength(3)
		expect(logs.join("\n")).not.toContain(CLAUDE_TOKEN)
		expect(logs.join("\n")).not.toContain(ANTIGRAVITY_TOKEN)
		expect(logs.join("\n")).not.toContain(CURSOR_TOKEN)
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
		expect(logs).toHaveLength(4)
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
