import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
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
 * Writes auth's deletion notice (ADR 0015). A tombstone always lands. A community contributor's
 * rows and row go; the org is only unbound, so the published series survives. One batch does it all,
 * and an id no contributor holds still leaves its tombstone.
 */
export async function deleteContributor(
	db: D1Database,
	authUserId: string,
	hash: string,
	nowIso: string,
): Promise<void> {
	const found = await db
		.prepare("SELECT id, kind FROM contributor WHERE auth_user_id = ?")
		.bind(authUserId)
		.first<{ id: string; kind: "org" | "community" }>()
	const statements: D1PreparedStatement[] = [
		db
			.prepare(
				"INSERT OR IGNORE INTO contributor_tombstone (auth_user_hash, deleted_at) VALUES (?, ?)",
			)
			.bind(hash, nowIso),
	]
	if (found?.kind === "community") {
		statements.push(
			db.prepare("DELETE FROM usage_hourly WHERE contributor_id = ?").bind(found.id),
			db.prepare("DELETE FROM quota_sample WHERE contributor_id = ?").bind(found.id),
			db.prepare("DELETE FROM ingest_log WHERE contributor_id = ?").bind(found.id),
			db.prepare("DELETE FROM contributor WHERE id = ?").bind(found.id),
		)
	} else if (found?.kind === "org") {
		statements.push(
			db.prepare("UPDATE contributor SET auth_user_id = NULL WHERE id = ?").bind(found.id),
		)
	}
	await db.batch(statements)
}
