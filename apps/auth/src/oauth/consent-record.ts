import { APIError } from "better-auth/api"
import { adapterOf } from "./adapter"
import { consentCovers, mergeIntoKeeper } from "./consent-merge"
import { type ConsentWrite, undoConsentWrite } from "./consent-write"
import { consentExpired } from "./expiry"
import { deleteConsentRow, deleteTokenFamily } from "./family"
import { hookNow, type OAuthHookOptions } from "./request"
import { findConsents, type StoredConsent } from "./store"
import { deletePendingAuthorizationCodes } from "./verification-sql"

const ATTEMPTS = 3

type Approval = { clientId: string; userId: string; scopes: string[]; resources: string[] }
type Inserted = { id: string; writtenAt: Date }
type Recording = {
	ctx: { context: unknown; headers?: Headers | undefined }
	input: Approval
	options: OAuthHookOptions
	/** The row this request inserted, once it has. */
	inserted?: Inserted | undefined
}

/**
 * Writes one approval to the consent row, merging any duplicates. A live consent keeps its
 * `createdAt` and gains the union of the scopes and resources; if every existing row is expired,
 * the old rows, their token family and their pending authorization codes are deleted first, so the
 * fresh approval cannot inherit an old token.
 *
 * The return value says what the write changed, so the `/device/approve` after-hook can take it
 * back when the endpoint refuses the code the approval was written for. Only the request whose own
 * insert created the surviving row may record `created`; undoing a row another approval has merged
 * into would delete a grant that approval relies on.
 *
 * The library has no unique constraint on (clientId, userId), so two concurrent approvals can
 * insert two rows. The create path re-reads and merges, keeping the deterministic keeper, so both
 * passes converge on one row.
 *
 * Another request can change or delete a row between this one's read and its merge. The merge then
 * writes nothing and the step runs again from a fresh read. After three such passes it throws, so
 * the approval fails instead of succeeding without its consent.
 */
export async function recordConsent(
	ctx: Recording["ctx"],
	input: Approval,
	options: OAuthHookOptions,
): Promise<ConsentWrite> {
	const recording: Recording = { ctx, input, options }
	for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
		const write = await recordOnce(recording)
		if (write !== null) return write
	}
	if (recording.inserted !== undefined) {
		await undoConsentWrite(options.database, { kind: "created", ...recording.inserted })
	}
	throw new APIError("INTERNAL_SERVER_ERROR", {
		error: "server_error",
		error_description: "the approval could not be recorded; approve the device again",
	})
}

/** One pass. `null` means a row moved on between the read and the write. */
async function recordOnce(recording: Recording): Promise<ConsentWrite | null> {
	if (recording.inserted !== undefined) return finishCreate(recording, recording.inserted)
	const { rows, live } = await readConsents(recording)
	if (live.length > 0) return merge(recording, rows, live)
	const inserted = await insertFresh(recording, rows)
	if (inserted === null) return { kind: "none" }
	recording.inserted = inserted
	return finishCreate(recording, inserted)
}

async function readConsents({ ctx, input, options }: Recording) {
	const rows = await findConsents(ctx, input.clientId, input.userId)
	return { rows, live: rows.filter((row) => !consentExpired(ctx, row, options)) }
}

function merge(
	{ ctx, input, options }: Recording,
	rows: readonly StoredConsent[],
	live: readonly StoredConsent[],
): Promise<ConsentWrite | null> {
	const { scopes, resources } = input
	const now = hookNow(ctx, options)
	return mergeIntoKeeper(ctx, options.database, { rows, live, scopes, resources, now })
}

/**
 * A newly created consent never attaches to tokens from an earlier grant. Never move `createdAt`
 * without deleting the family.
 */
async function insertFresh(
	{ ctx, input, options }: Recording,
	expired: readonly StoredConsent[],
): Promise<Inserted | null> {
	const owner = { clientId: input.clientId, userId: input.userId }
	for (const row of expired) await deleteConsentRow(ctx, row.id)
	await deleteTokenFamily(ctx, owner)
	await deletePendingAuthorizationCodes(options.database, owner)
	const now = hookNow(ctx, options)
	const created = (await adapterOf(ctx).create({
		model: "oauthConsent",
		data: {
			...owner,
			scopes: input.scopes,
			resources: input.resources.length > 0 ? input.resources : null,
			referenceId: null,
			createdAt: now,
			updatedAt: now,
		},
	})) as { id?: unknown } | null
	const id = created === null ? undefined : created.id
	return typeof id === "string" ? { id, writtenAt: now } : null
}

/** Decides what this request's insert may undo, after a concurrent approval may have joined it. */
async function finishCreate(
	recording: Recording,
	inserted: Inserted,
): Promise<ConsentWrite | null> {
	const { rows, live } = await readConsents(recording)
	if (live.length > 1) {
		// Another request inserted its own row and this one merges with it. That approval is not
		// this request's to undo, whichever row is the keeper.
		return (await merge(recording, rows, live)) === null ? null : { kind: "none" }
	}
	const only = live[0]
	if (only?.id === inserted.id) return { kind: "created", ...inserted }
	if (only !== undefined && consentCovers(only, recording.input)) return { kind: "none" }
	// The inserted row is gone and no row holds this approval: start from the top.
	recording.inserted = undefined
	return null
}
