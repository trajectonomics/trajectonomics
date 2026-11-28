import type { D1Database } from "@cloudflare/workers-types"
import type { SenderLookup } from "../core/sender"

/** One row for any `sub`: the contributor holding it, its tombstone, and the org's binding. */
const READ_SENDER = `
SELECT c.id AS id, c.kind AS kind,
	EXISTS(SELECT 1 FROM contributor_tombstone WHERE auth_user_hash = ?) AS deleted,
	(SELECT auth_user_id IS NULL FROM contributor WHERE id = 'trajectonomics') AS org_unbound
FROM (SELECT 1) LEFT JOIN contributor c ON c.auth_user_id = ?`

type SenderRow = {
	id: string | null
	kind: "org" | "community" | null
	deleted: number | null
	org_unbound: number | null
}

function flag(value: number | null | undefined): boolean {
	return value === 1
}

/** Reads in one D1 query who a token's `sub` is, whether it is deleted, and whether the org is bound. */
export async function readSender(
	db: D1Database,
	sub: string,
	subHash: string,
): Promise<SenderLookup> {
	const row = await db.prepare(READ_SENDER).bind(subHash, sub).first<SenderRow>()
	return {
		contributorId: row?.id ?? null,
		kind: row?.kind ?? null,
		deleted: flag(row?.deleted),
		orgUnbound: flag(row?.org_unbound),
	}
}

/**
 * Writes auth's deletion notice (ADR 0015) with no prior read, so it cannot race a first bind. One
 * batch: the tombstone, then a set-based delete of a community contributor's rows and its row, then
 * the org unbind, which keeps the published series. An id no contributor holds still tombstones.
 */
export async function deleteContributor(
	db: D1Database,
	authUserId: string,
	hash: string,
	nowIso: string,
): Promise<void> {
	const community = "SELECT id FROM contributor WHERE auth_user_id = ? AND kind = 'community'"
	await db.batch([
		db
			.prepare(
				"INSERT OR IGNORE INTO contributor_tombstone (auth_user_hash, deleted_at) VALUES (?, ?)",
			)
			.bind(hash, nowIso),
		db.prepare(`DELETE FROM usage_hourly WHERE contributor_id IN (${community})`).bind(authUserId),
		db.prepare(`DELETE FROM quota_sample WHERE contributor_id IN (${community})`).bind(authUserId),
		db.prepare(`DELETE FROM ingest_log WHERE contributor_id IN (${community})`).bind(authUserId),
		db
			.prepare("DELETE FROM contributor WHERE auth_user_id = ? AND kind = 'community'")
			.bind(authUserId),
		db
			.prepare("UPDATE contributor SET auth_user_id = NULL WHERE auth_user_id = ? AND kind = 'org'")
			.bind(authUserId),
	])
}
