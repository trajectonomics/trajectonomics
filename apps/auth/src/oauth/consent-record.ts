import { APIError } from "better-auth/api"
import { adapterOf } from "./adapter"
import { consentCovers, mergeIntoKeeper } from "./consent-merge"
import { type ConsentWrite, nextConsentUpdatedAt, undoConsentWrite } from "./consent-write"
import { consentExpired } from "./expiry"
import { deleteConsentRow, deleteTokenFamily, snapshotTokenFamily, type TokenIds } from "./family"
import { hookNow, type OAuthHookOptions } from "./request"
import { findConsents, type StoredConsent } from "./store"
import { deletePendingAuthorizationCodes } from "./verification-sql"

const ATTEMPTS = 3
const NONE: ConsentWrite = { kind: "none" }

type Approval = { clientId: string; userId: string; scopes: string[]; resources: string[] }
type Inserted = { id: string; writtenAt: Date }
type Recording = {
	ctx: { context: unknown; headers?: Headers | undefined }
	input: Approval
	options: OAuthHookOptions
	/** The row this request inserted, once it has. */
	inserted?: Inserted | undefined
}
type Read = { rows: StoredConsent[]; live: StoredConsent[]; now: Date }

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
 *
 * The family is read only when the first read finds no live consent, and the consents are read
 * again after it: a live consent in the second read is another approval that landed in between,
 * and it owns the family, so this pass merges into it and deletes no token.
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
	if (recording.inserted !== undefined)
		await undoConsentWrite(
			options.database,
			{ kind: "created", ...recording.inserted },
			hookNow(recording.ctx, options),
		)
	throw new APIError("INTERNAL_SERVER_ERROR", {
		error: "server_error",
		error_description: "the approval could not be recorded; approve the device again",
	})
}

/** One pass. `null` means a row moved on between the read and the write. */
async function recordOnce(recording: Recording): Promise<ConsentWrite | null> {
	if (recording.inserted !== undefined) return finishCreate(recording, recording.inserted)
	const read = await readConsents(recording)
	if (read.live.length > 0) return merge(recording, read)
	// Snapshot before the read that decides the delete, so a token another approval mints
	// afterwards survives. Only this miss path reads the family; a live consent never does.
	const ids = await snapshotTokenFamily(recording.options.database, recording.input)
	const after = await readConsents(recording)
	// An approval that landed since the first read is live now. It owns the family, so this
	// approval merges into it rather than deleting the tokens it is about to use.
	if (after.live.length > 0) return merge(recording, after)
	const inserted = await insertFresh(recording, after.rows, ids, after.now)
	if (inserted === null) return NONE
	recording.inserted = inserted
	return finishCreate(recording, inserted)
}

/**
 * The grant's consent rows and the clock. No token query: the family is read only after this read
 * finds no live consent, because a live consent goes straight to the merge.
 */
async function readConsents({ ctx, input, options }: Recording): Promise<Read> {
	const now = hookNow(ctx, options)
	const rows = await findConsents(ctx, input.clientId, input.userId)
	return { rows, live: rows.filter((row) => !consentExpired(ctx, row, options)), now }
}

function merge({ ctx, input, options }: Recording, read: Read): Promise<ConsentWrite | null> {
	const { scopes, resources } = input
	return mergeIntoKeeper(ctx, options.database, { ...read, scopes, resources })
}

/**
 * A newly created consent does not attach to tokens from an earlier grant (ADR 0002 names the
 * in-flight exchange that can slip past). Never move `createdAt`
 * without deleting the family. Only the tokens the snapshot taken before the second read listed
 * go: a token another approval minted after that snapshot is that approval's, not a leftover, and
 * the snapshot's ids keep it safe from the whole-second `createdAt` the library stores.
 */
async function insertFresh(
	{ ctx, input, options }: Recording,
	expired: readonly StoredConsent[],
	ids: TokenIds,
	now: Date,
): Promise<Inserted | null> {
	const owner = { clientId: input.clientId, userId: input.userId }
	for (const row of expired) await deleteConsentRow(ctx, row.id)
	await deleteTokenFamily(options.database, ids)
	await deletePendingAuthorizationCodes(options.database, owner)
	const updatedAt = nextConsentUpdatedAt(now, ...expired.map((row) => row.updatedAt))
	const created = (await adapterOf(ctx).create({
		model: "oauthConsent",
		data: {
			...owner,
			scopes: input.scopes,
			resources: input.resources.length > 0 ? input.resources : null,
			referenceId: null,
			createdAt: now,
			updatedAt,
		},
	})) as { id?: unknown } | null
	return typeof created?.id === "string" ? { id: created.id, writtenAt: updatedAt } : null
}

/** Decides what this request's insert may undo, after a concurrent approval may have joined it. */
async function finishCreate(
	recording: Recording,
	inserted: Inserted,
): Promise<ConsentWrite | null> {
	const read = await readConsents(recording)
	// Another request inserted its own row and this one merges with it. That approval is not this
	// request's to undo, whichever row is the keeper.
	if (read.live.length > 1) return (await merge(recording, read)) === null ? null : NONE
	const only = read.live[0]
	if (only?.id === inserted.id) return { kind: "created", ...inserted }
	if (only !== undefined && consentCovers(only, recording.input)) return NONE
	// The inserted row is gone and no row holds this approval: start from the top.
	recording.inserted = undefined
	return null
}
