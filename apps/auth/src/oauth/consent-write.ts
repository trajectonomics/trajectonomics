/**
 * What one approval changed in `oauthConsent`, and the way back.
 *
 * The `/device/approve` before-hook writes the consent before the endpoint flips the code to
 * `approved`, and the endpoint can still refuse after that write (a concurrent approve, a deny, a
 * revoke, an expiry). The after-hook takes the write back through this record.
 *
 * Each way back is one conditional statement, never a read followed by a write: the row is only
 * touched while it still carries the `updatedAt` this write stamped. A revoke that deleted the row,
 * or a later approval that bumped it, owns it now and is never undone. Zero changed rows means the
 * row moved on; it is left alone.
 */
import type { D1Database } from "@cloudflare/workers-types"
import { storedResources } from "./values"

export type ConsentWrite =
	| { kind: "none" }
	| { kind: "created"; id: string; writtenAt: Date }
	| {
			kind: "merged"
			id: string
			previousScopes: unknown
			previousResources: unknown
			previousUpdatedAt: unknown
			writtenAt: Date
	  }

const DELETE_CREATED = `delete from "oauthConsent" where "id" = ?1 and "updatedAt" = ?2`

const RESTORE_MERGED = `update "oauthConsent" set "scopes" = ?1, "resources" = ?2, "updatedAt" = ?3
where "id" = ?4 and "updatedAt" = ?5`

/** Undoes one approval's write, unless a later one has updated the same row since. */
export async function undoConsentWrite(database: D1Database, write: ConsentWrite): Promise<void> {
	if (write.kind === "none") return
	const writtenAt = sqlInstant(write.writtenAt)
	if (writtenAt === null) return
	if (write.kind === "created") {
		await database.prepare(DELETE_CREATED).bind(write.id, writtenAt).run()
		return
	}
	const resources = storedResources(write.previousResources)
	await database
		.prepare(RESTORE_MERGED)
		.bind(
			JSON.stringify(storedResources(write.previousScopes)),
			resources.length > 0 ? JSON.stringify(resources) : null,
			sqlInstant(write.previousUpdatedAt),
			write.id,
			writtenAt,
		)
		.run()
}

/**
 * The exact text a D1 `date` column holds. The adapter writes a `Date` as its ISO string on SQLite
 * and reads it back as a `Date`, so binding a `Date` directly would never match the stored row.
 * A value with no readable instant leaves the conditional statement matching nothing, which is the
 * safe direction: the write is not undone.
 */
function sqlInstant(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
	if (typeof value === "string") return value
	return null
}
