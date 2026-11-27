/**
 * What one approval changed in `oauthConsent`, and the way back.
 *
 * The `/device/approve` before-hook writes the consent before the endpoint flips the code to
 * `approved`, and the endpoint can still refuse after that write (a concurrent deny, a revoke, an
 * expired code). The after-hook takes the write back through this record: a row the hook created
 * is deleted, and a row it merged into gets its previous scopes and resources, unless a later
 * approval now owns that row.
 */
import { adapterOf } from "./adapter"
import type { StoredConsent } from "./store"
import { asDate, storedResources } from "./values"

export type ConsentWrite =
	| { kind: "none" }
	| { kind: "created"; id: string }
	| {
			kind: "merged"
			id: string
			previousScopes: unknown
			previousResources: unknown
			previousUpdatedAt: unknown
			writtenAt: Date
	  }

/** Undoes one approval's write, unless a later one has updated the same row since. */
export async function undoConsentWrite(
	ctx: { context: unknown },
	write: ConsentWrite,
): Promise<void> {
	if (write.kind === "none") return
	const adapter = adapterOf(ctx)
	if (write.kind === "created") {
		await adapter.delete({ model: "oauthConsent", where: [{ field: "id", value: write.id }] })
		return
	}
	const row = (await adapter.findOne({
		model: "oauthConsent",
		where: [{ field: "id", value: write.id }],
	})) as StoredConsent | null
	// A revoke that removed the row, or a later approval that bumped `updatedAt`, owns it now.
	if (row === null || !sameInstant(row.updatedAt, write.writtenAt)) return
	const resources = storedResources(write.previousResources)
	await adapter.update({
		model: "oauthConsent",
		where: [{ field: "id", value: write.id }],
		update: {
			scopes: storedResources(write.previousScopes),
			resources: resources.length > 0 ? resources : null,
			updatedAt: write.previousUpdatedAt,
		},
	})
}

function sameInstant(left: unknown, right: unknown): boolean {
	const a = asDate(left)
	const b = asDate(right)
	return a !== null && b !== null && a.getTime() === b.getTime()
}
