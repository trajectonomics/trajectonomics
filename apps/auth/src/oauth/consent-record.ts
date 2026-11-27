import { pickConsentKeeper, unionValues } from "../core/consent"
import { adapterOf } from "./adapter"
import type { ConsentWrite } from "./consent-write"
import { consentExpired } from "./expiry"
import { deleteConsentRow, deleteTokenFamily } from "./family"
import { hookNow, type OAuthHookOptions } from "./request"
import { findConsents, type StoredConsent } from "./store"
import { storedResources } from "./values"
import { deletePendingAuthorizationCodes } from "./verification-sql"

/**
 * Writes one approval to the consent row, merging any duplicates. A live consent keeps its
 * `createdAt` and gains the union of the scopes and resources; if every existing row is expired,
 * the old rows, their token family and their pending authorization codes are deleted first, so the
 * fresh approval cannot inherit an old token.
 *
 * The return value says what the write changed, so the `/device/approve` after-hook can take it
 * back when the endpoint refuses the code the approval was written for.
 *
 * The library has no unique constraint on (clientId, userId), so two concurrent approvals can
 * insert two rows. The create path re-reads and merges, keeping the deterministic keeper, so both
 * passes converge on one row.
 */
export async function recordConsent(
	ctx: { context: unknown; headers?: Headers | undefined },
	input: { clientId: string; userId: string; scopes: string[]; resources: string[] },
	options: OAuthHookOptions,
): Promise<ConsentWrite> {
	const owner = { clientId: input.clientId, userId: input.userId }
	const now = hookNow(ctx, options)
	const rows = await findConsents(ctx, input.clientId, input.userId)
	const live = rows.filter((row) => !consentExpired(ctx, row, options))
	if (live.length > 0) {
		const merged = await mergeIntoKeeper(ctx, rows, live, [input.scopes], [input.resources], now)
		return merged === null ? { kind: "none" } : { kind: "merged", ...merged, writtenAt: now }
	}
	// A newly created consent never attaches to tokens from an earlier grant. Never move
	// `createdAt` without deleting the family.
	for (const row of rows) await deleteConsentRow(ctx, row.id)
	await deleteTokenFamily(ctx, owner)
	await deletePendingAuthorizationCodes(options.database, owner)
	const created = (await adapterOf(ctx).create({
		model: "oauthConsent",
		data: {
			clientId: input.clientId,
			userId: input.userId,
			scopes: input.scopes,
			resources: input.resources.length > 0 ? input.resources : null,
			referenceId: null,
			createdAt: now,
			updatedAt: now,
		},
	})) as { id?: unknown } | null
	const reread = await findConsents(ctx, input.clientId, input.userId)
	const liveAgain = reread.filter((row) => !consentExpired(ctx, row, options))
	if (liveAgain.length > 1) await mergeIntoKeeper(ctx, reread, liveAgain, [], [], now)
	const id = created === null ? undefined : created.id
	return typeof id === "string" ? { kind: "created", id } : { kind: "none" }
}

type PreviousConsent = {
	id: string
	previousScopes: unknown
	previousResources: unknown
	previousUpdatedAt: unknown
}

async function mergeIntoKeeper(
	ctx: { context: unknown },
	rows: readonly StoredConsent[],
	live: readonly StoredConsent[],
	extraScopes: readonly (readonly string[])[],
	extraResources: readonly (readonly string[])[],
	now: Date,
): Promise<PreviousConsent | null> {
	const keeper = pickConsentKeeper(live)
	if (keeper === null) return null
	const previous = live.find((row) => row.id === keeper)
	if (previous === undefined) return null
	const scopes = unionValues([...live.map(consentScopes), ...extraScopes])
	const resources = unionValues([...live.map(consentResources), ...extraResources])
	await adapterOf(ctx).update({
		model: "oauthConsent",
		where: [{ field: "id", value: keeper }],
		update: { scopes, resources: resources.length > 0 ? resources : null, updatedAt: now },
	})
	for (const row of rows) {
		if (row.id === keeper) continue
		await deleteConsentRow(ctx, row.id)
	}
	return {
		id: keeper,
		previousScopes: previous.scopes,
		previousResources: previous.resources,
		previousUpdatedAt: previous.updatedAt,
	}
}

function consentScopes(consent: StoredConsent): string[] {
	return storedResources(consent.scopes)
}

function consentResources(consent: StoredConsent): string[] {
	return storedResources(consent.resources)
}
