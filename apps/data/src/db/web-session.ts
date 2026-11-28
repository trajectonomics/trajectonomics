import type { D1Database } from "@cloudflare/workers-types"
import type { CollectorRow } from "../core/collectors"
import type { MeterReadingRow, RecentPlanRow } from "../core/meters"

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
const METER_READINGS = `
SELECT q.plan AS plan,
	MAX(q.sampled_at) AS last_sampled_at
FROM web_session s
JOIN contributor c ON c.auth_user_id = s.auth_user_id
JOIN quota_sample q ON q.contributor_id = c.id
WHERE s.session_hash = ? AND s.expires_at > ?
GROUP BY q.plan
ORDER BY q.plan`
const RECENT_PLANS = `
SELECT DISTINCT u.plan AS plan
FROM web_session s
JOIN contributor c ON c.auth_user_id = s.auth_user_id
JOIN usage_hourly u ON u.contributor_id = c.id
WHERE s.session_hash = ? AND s.expires_at > ? AND u.hour_utc >= ?
ORDER BY u.plan`

/** How far back a usage row still counts as a plan in recent use. */
const RECENT_USE_MS = 7 * 86_400_000

/** What a session read answers: whether it signed in, and the collectors and meters it may see. */
export type CollectorRead = {
	signedIn: boolean
	rows: CollectorRow[]
	readings: MeterReadingRow[]
	recentPlans: RecentPlanRow[]
}

type BatchRow = { results?: unknown[] }

// A tombstoned `sub` never signs in again (ADR 0015), so the insert writes nothing for one.
const INSERT_SESSION = `
INSERT INTO web_session (session_hash, auth_user_id, created_at, expires_at)
SELECT ?, ?, ?, ?
WHERE NOT EXISTS (SELECT 1 FROM contributor_tombstone WHERE auth_user_hash = ?)
RETURNING session_hash`

/**
 * Purges expired sessions and inserts the new one in one batched write (ADR 0015). Answers false,
 * with no row written, when the user was deleted.
 */
export async function createWebSession(
	db: D1Database,
	session: { hash: string; authUserId: string; authUserHash: string },
	createdAt: string,
	expiresAt: string,
): Promise<boolean> {
	const results = (await db.batch([
		db.prepare("DELETE FROM web_session WHERE expires_at <= ?").bind(createdAt),
		db
			.prepare(INSERT_SESSION)
			.bind(session.hash, session.authUserId, createdAt, expiresAt, session.authUserHash),
	])) as BatchRow[]
	return (results[1]?.results ?? []).length > 0
}

/** Removes one session by its hash; an unknown hash removes nothing. */
export async function deleteWebSession(db: D1Database, sessionHash: string): Promise<void> {
	await db.prepare("DELETE FROM web_session WHERE session_hash = ?").bind(sessionHash).run()
}

/**
 * Reads the session, its collectors and its usage meters in one batch of four statements: the
 * session statement decides signed-in or not, and the rest join through the session so they need no
 * round trip. The meter statements return the newest reading per plan, and the plans used in the
 * last seven days.
 */
export async function readCollectors(
	db: D1Database,
	sessionHash: string,
	nowIso: string,
): Promise<CollectorRead> {
	const sinceIso = new Date(Date.parse(nowIso) - RECENT_USE_MS).toISOString()
	const results = (await db.batch([
		db.prepare(SESSION_LOOKUP).bind(sessionHash, nowIso),
		db.prepare(COLLECTORS).bind(sessionHash, nowIso),
		db.prepare(METER_READINGS).bind(sessionHash, nowIso),
		db.prepare(RECENT_PLANS).bind(sessionHash, nowIso, sinceIso),
	])) as BatchRow[]
	const sessions = (results[0]?.results ?? []) as { auth_user_id: string }[]
	const rows = (results[1]?.results ?? []) as CollectorRow[]
	const readings = (results[2]?.results ?? []) as MeterReadingRow[]
	const recentPlans = (results[3]?.results ?? []) as RecentPlanRow[]
	return { signedIn: sessions.length > 0, rows, readings, recentPlans }
}
