import type { D1Database } from "@cloudflare/workers-types"
import { pickConsentKeeper, unionValues } from "../core/consent"
import { type ConsentWrite, mergeConsent } from "./consent-write"
import { deleteConsentRow } from "./family"
import type { StoredConsent } from "./store"
import { storedResources } from "./values"

/**
 * Merges one approval and every live row of its grant into the deterministic keeper, then deletes
 * the other rows. `null`: the keeper changed or vanished after `rows` was read, so nothing was
 * written or deleted and the caller has to read again.
 */
export async function mergeIntoKeeper(
	ctx: { context: unknown },
	database: D1Database,
	merge: {
		rows: readonly StoredConsent[]
		live: readonly StoredConsent[]
		scopes: readonly string[]
		resources: readonly string[]
		now: Date
	},
): Promise<ConsentWrite | null> {
	const keeper = pickConsentKeeper(merge.live)
	const previous = merge.live.find((row) => row.id === keeper)
	if (previous === undefined) return null
	const scopes = [...merge.live.map((row) => storedResources(row.scopes)), merge.scopes]
	const resources = [...merge.live.map((row) => storedResources(row.resources)), merge.resources]
	const written = await mergeConsent(database, {
		id: previous.id,
		readAt: previous.updatedAt,
		next: {
			scopes: unionValues(scopes),
			resources: unionValues(resources),
			updatedAt: merge.now,
		},
	})
	if (!written) return null
	for (const row of merge.rows) {
		if (row.id !== previous.id) await deleteConsentRow(ctx, row.id)
	}
	return {
		kind: "merged",
		id: previous.id,
		previousScopes: previous.scopes,
		previousResources: previous.resources,
		previousUpdatedAt: previous.updatedAt,
		writtenAt: merge.now,
	}
}

/** Whether a row already holds everything one approval grants. */
export function consentCovers(
	consent: StoredConsent,
	approval: { scopes: readonly string[]; resources: readonly string[] },
): boolean {
	const scopes = storedResources(consent.scopes)
	const resources = storedResources(consent.resources)
	return (
		approval.scopes.every((scope) => scopes.includes(scope)) &&
		approval.resources.every((resource) => resources.includes(resource))
	)
}
