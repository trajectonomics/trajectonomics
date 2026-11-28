import type { Database } from "bun:sqlite"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import { sha256Hex } from "../../src/core/hash"
import { OAUTH_COOKIE } from "../../src/core/web-auth"
import { NOW_ISO, quotaSample, usageRow } from "./fixtures"

/** Deterministic bytes for state, verifier and the session id, seeded per test. */
export function testRandom(seed = 1): (length: number) => Uint8Array {
	return (length) => Uint8Array.from({ length }, (_, index) => (seed + index) % 256)
}

/** Every Set-Cookie header on a response, as separate values. */
export function setCookies(response: Response): string[] {
	return response.headers.getSetCookie()
}

/** One Set-Cookie value's payload, or null when the response does not set that cookie. */
export function cookieFrom(response: Response, name: string): string | null {
	for (const cookie of setCookies(response)) {
		const pair = cookie.split(";")[0] ?? ""
		const index = pair.indexOf("=")
		if (index > 0 && pair.slice(0, index) === name) return pair.slice(index + 1)
	}
	return null
}

/** A Cookie header carrying the OAuth state and verifier. */
export function oauthCookie(state: string, verifier: string): string {
	return `${OAUTH_COOKIE}=${state}.${verifier}`
}

/** Inserts a session row whose hash is the SHA-256 of the id, as the callback writes it. */
export async function seedSession(
	database: Database,
	sessionId: string,
	authUserId: string,
	expiresAt = "2026-11-25T20:34:56.000Z",
): Promise<void> {
	database
		.prepare(
			`INSERT INTO web_session (session_hash, auth_user_id, created_at, expires_at)
			 VALUES (?, ?, ?, ?)`,
		)
		.run(await sha256Hex(sessionId), authUserId, NOW_ISO, expiresAt)
}

/** A count of one table's rows, for the tests' assertions. */
export function count(database: Database, table: string): number {
	const row = database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
	return row.n
}

/** Inserts one synthetic usage row for a contributor, machine and UTC hour. */
export function seedUsage(
	database: Database,
	contributorId: string,
	machine: string,
	hourUtc: string,
	receivedAt: string,
	overrides: Partial<UsageRow> = {},
): void {
	const row = usageRow({ machine, hourUtc, ...overrides })
	database
		.prepare(
			`INSERT INTO usage_hourly (
				contributor_id, machine, plan, model, hour_utc, granularity,
				tokens_in, tokens_out, cache_read, cache_write, tokens_total,
				requests, source, best_effort, received_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			contributorId,
			row.machine,
			row.plan,
			row.model,
			row.hourUtc,
			row.granularity,
			row.tokensIn,
			row.tokensOut,
			row.cacheRead,
			row.cacheWrite,
			row.tokensTotal,
			row.requests,
			row.source,
			row.bestEffort ? 1 : 0,
			receivedAt,
		)
}

/** Inserts one synthetic quota reading for a contributor, plan and UTC hour. */
export function seedQuota(
	database: Database,
	contributorId: string,
	plan: string,
	sampledAt: string,
	receivedAt = sampledAt,
): void {
	const row = quotaSample({ plan, sampledAt })
	database
		.prepare(
			`INSERT INTO quota_sample (
				contributor_id, plan, window, sampled_at, used_pct, resets_at, received_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(contributorId, row.plan, row.window, row.sampledAt, row.usedPct, row.resetsAt, receivedAt)
}
