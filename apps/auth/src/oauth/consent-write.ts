/**
 * What one approval changes in `oauthConsent`, and the way back.
 *
 * The `/device/approve` before-hook writes the consent before the endpoint flips the code to
 * `approved`, and the endpoint can still refuse after that write (a concurrent approve, a deny, a
 * revoke, an expiry). The after-hook takes the write back through this record.
 *
 * Each write to an existing row is one conditional statement: a merge only touches the row while
 * it still carries the `updatedAt` the merge was computed from, and a way back only while it still
 * carries the `updatedAt` the write stamped. A revoke or an undo that removed the row, or another
 * approval that bumped it, owns it now. Zero changed rows means the row moved on; it is left alone.
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
			writtenAt: Date
	  }

const DELETE_CREATED = `delete from "oauthConsent" where "id" = ?1 and "updatedAt" = ?2`

const UPDATE_UNCHANGED = `update "oauthConsent" set "scopes" = ?1, "resources" = ?2, "updatedAt" = ?3
where "id" = ?4 and "updatedAt" = ?5`

type RowValues = { scopes: unknown; resources: unknown; updatedAt: unknown }

/** Writes a merge onto the row state it was computed from. `false`: the row moved on. */
export async function mergeConsent(
	database: D1Database,
	merge: { id: string; readAt: unknown; next: RowValues },
): Promise<boolean> {
	return updateUnchanged(database, merge.id, merge.readAt, merge.next)
}

/** Undoes one approval's write, unless a later one has updated the same row since. */
export async function undoConsentWrite(
	database: D1Database,
	write: ConsentWrite,
	now: Date,
): Promise<void> {
	if (write.kind === "none") return
	const writtenAt = sqlInstant(write.writtenAt)
	if (writtenAt === null) return
	if (write.kind === "created") {
		await database.prepare(DELETE_CREATED).bind(write.id, writtenAt).run()
		return
	}
	await updateUnchanged(database, write.id, writtenAt, {
		scopes: write.previousScopes,
		resources: write.previousResources,
		updatedAt: nextConsentUpdatedAt(now, writtenAt),
	})
}

async function updateUnchanged(
	database: D1Database,
	id: string,
	expectedUpdatedAt: unknown,
	next: RowValues,
): Promise<boolean> {
	const resources = storedResources(next.resources)
	const result = await database
		.prepare(UPDATE_UNCHANGED)
		.bind(
			JSON.stringify(storedResources(next.scopes)),
			resources.length > 0 ? JSON.stringify(resources) : null,
			sqlInstant(next.updatedAt),
			id,
			sqlInstant(expectedUpdatedAt),
		)
		.run()
	return result.meta.changes > 0
}

/**
 * The `updatedAt` a write stamps: strictly later than the latest value it read. Two writes to one
 * row in the same millisecond would otherwise share a stamp, and the first undo, keyed on that
 * stamp, would match the row the second write now owns. A stamp later than the clock also keeps
 * the column monotonic when the clock repeats or steps back.
 */
export function nextConsentUpdatedAt(now: Date, ...previous: readonly unknown[]): Date {
	let latest = Number.NEGATIVE_INFINITY
	for (const value of previous) {
		const instant = instantMs(value)
		if (instant !== null && instant > latest) latest = instant
	}
	return new Date(Math.max(now.getTime(), latest + 1))
}

function instantMs(value: unknown): number | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
	if (typeof value !== "string") return null
	const parsed = Date.parse(value)
	return Number.isFinite(parsed) ? parsed : null
}

/**
 * The exact text a D1 `date` column holds. The adapter writes a `Date` as its ISO string on SQLite
 * and reads it back as a `Date`, so binding a `Date` directly would never match the stored row.
 * A value with no readable instant leaves the conditional statement matching nothing, which is the
 * safe direction: nothing is overwritten.
 */
function sqlInstant(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
	if (typeof value === "string") return value
	return null
}
