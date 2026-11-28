import type { D1Database } from "@cloudflare/workers-types"
import type { CollectorRow } from "../core/collectors"

const SESSION_LOOKUP =
	"SELECT auth_user_id FROM web_session WHERE session_hash = ? AND expires_at > ?"
const COLLECTORS = `
SELECT u.machine AS machine,
	MIN(substr(u.hour_utc, 1, 10)) AS first_day,
	MAX(substr(u.hour_utc, 1, 10)) AS last_day,
	COUNT(*) AS rows,
	MAX(u.received_at) AS last_received_at
FROM web_session s
JOIN contributor c ON c.auth_user_id = s.auth_user_id
JOIN usage_hourly u ON u.contributor_id = c.id
WHERE s.session_hash = ? AND s.expires_at > ?
GROUP BY u.machine
ORDER BY last_received_at DESC, u.machine`

/** What a session read answers: whether it signed in, and the collectors it may see. */
export type CollectorRead = { signedIn: boolean; rows: CollectorRow[] }

type BatchRow = { results?: unknown[] }

/** Purges expired sessions and inserts the new one in one batched write (ADR 0015). */
export async function createWebSession(
	db: D1Database,
	sessionHash: string,
	authUserId: string,
	createdAt: string,
	expiresAt: string,
): Promise<void> {
	await db.batch([
		db.prepare("DELETE FROM web_session WHERE expires_at <= ?").bind(createdAt),
		db
			.prepare(
				"INSERT INTO web_session (session_hash, auth_user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
			)
			.bind(sessionHash, authUserId, createdAt, expiresAt),
	])
}

/** Removes one session by its hash; an unknown hash removes nothing. */
export async function deleteWebSession(db: D1Database, sessionHash: string): Promise<void> {
	await db.prepare("DELETE FROM web_session WHERE session_hash = ?").bind(sessionHash).run()
}

/**
 * Reads the session and its collectors in one batch of two statements: the session statement
 * decides signed-in or not, and the second joins through the session so it needs no round trip.
 */
export async function readCollectors(
	db: D1Database,
	sessionHash: string,
	nowIso: string,
): Promise<CollectorRead> {
	const results = (await db.batch([
		db.prepare(SESSION_LOOKUP).bind(sessionHash, nowIso),
		db.prepare(COLLECTORS).bind(sessionHash, nowIso),
	])) as BatchRow[]
	const sessions = (results[0]?.results ?? []) as { auth_user_id: string }[]
	const rows = (results[1]?.results ?? []) as CollectorRow[]
	return { signedIn: sessions.length > 0, rows }
}
