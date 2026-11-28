import { join } from "node:path"
import type { FetchInit, FetchLike } from "../../src/quota/fetch"
import type { CommandRunner, SampleDeps } from "../../src/quota/sample"

const HOME = "/home/synthetic"
export const NOW = Date.parse("2026-11-27T14:26:00.000Z")
export const ANTIGRAVITY_PATH = join(HOME, ".gemini/antigravity/antigravity-oauth-token")
export const CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
export const OPENCODE_URL = "https://opencode.ai/inference/go/v1/usage"
export const ANTIGRAVITY_URL =
	"https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary"
export const CURSOR_URL =
	"https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
export const CLAUDE_TOKEN = "synthetic-claude-token"
export const ANTIGRAVITY_TOKEN = "synthetic-antigravity-token"
export const AGY = "/synthetic/bin/agy"

function syntheticJwt(expSeconds: number): string {
	const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
	return `${part({ alg: "HS256" })}.${part({ exp: expSeconds })}.sig`
}

export const CURSOR_TOKEN = syntheticJwt(Math.floor((NOW + 60_000) / 1000))
export const CLAUDE_BODY = {
	five_hour: { utilization: 23, resets_at: "2026-11-27T14:20:00.160769+00:00" },
	seven_day: { utilization: 31, resets_at: "2026-11-30T08:00:00.160792+00:00" },
}
export const OPENCODE_BODY = {
	usage: {
		rolling: { percent: 4, resetsAt: "2026-11-27T14:26:54.000Z" },
		weekly: { percent: 55, resetsAt: "2026-11-30T00:00:00.000Z" },
		monthly: { percent: 27, resetsAt: "2026-12-25T11:51:02.000Z" },
	},
}
export const ANTIGRAVITY_BODY = {
	groups: [
		{
			buckets: [
				{ bucketId: "gemini-5h", window: "5h", remainingFraction: 0.9 },
				{ bucketId: "gemini-weekly", window: "weekly", remainingFraction: 0.75 },
			],
		},
	],
}
export const CURSOR_BODY = {
	billingCycleEnd: String(Date.parse("2026-12-01T00:00:00.000Z")),
	planUsage: { totalPercentUsed: 20 },
}
export const MUSE_STDOUT = JSON.stringify({
	allowance: {
		window: { usedPercent: 10, resetsAtMs: Date.parse("2026-11-27T18:00:00.000Z") },
		weekly: { usedPercent: 30, resetsAtMs: Date.parse("2026-12-01T00:00:00.000Z") },
	},
})

export function credentialFiles(expiresAt = NOW + 60_000): Record<string, string> {
	return {
		[join(HOME, ".claude/.credentials.json")]: JSON.stringify({
			claudeAiOauth: { accessToken: CLAUDE_TOKEN, expiresAt },
		}),
		[join(HOME, ".local/share/opencode/auth.json")]: JSON.stringify({
			"opencode-go": { key: "synthetic-opencode-key" },
		}),
		[ANTIGRAVITY_PATH]: antigravityTokenFile(ANTIGRAVITY_TOKEN, expiresAt),
		[join(HOME, ".config/cursor/auth.json")]: JSON.stringify({
			accessToken: syntheticJwt(Math.floor(expiresAt / 1000)),
		}),
	}
}

/** A synthetic Antigravity token file with one explicit expiry. */
export function antigravityTokenFile(accessToken: string, expiryMs: number): string {
	const expiry = new Date(expiryMs).toISOString()
	return JSON.stringify({ token: { access_token: accessToken, expiry } })
}

export function fakeFetch(replies: Record<string, { status?: number; body: unknown } | Error>) {
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

export function makeDeps(
	fetch: FetchLike,
	files: Record<string, string> = credentialFiles(),
	runCommand: CommandRunner = async () => ({ exitCode: 0, stdout: MUSE_STDOUT }),
	agyBinary: (home: string) => string = () => AGY,
) {
	const logs: string[] = []
	const deps: SampleDeps = {
		home: HOME,
		nowMs: NOW,
		fetch,
		readText: (path: string) => files[path] ?? null,
		log: (line: string) => logs.push(line),
		antigravityTokenPath: () => (files[ANTIGRAVITY_PATH] ? ANTIGRAVITY_PATH : null),
		agyBinary,
		runCommand,
	}
	return { logs, files, deps }
}
