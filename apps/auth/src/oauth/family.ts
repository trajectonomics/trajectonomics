/**
 * The rows that make up one user+client grant family, and their deletion order.
 *
 * Revocation deletes every consent for the user and client (not just the row the request named),
 * then the pending device codes, then the pending authorization codes, then the token family (the
 * same user+client family 1.7.28 uses for replay detection). The consents go first so a
 * concurrent rotation lands on a grant with no approval record and fails closed (ADR 0002).
 *
 * Authorization codes are not a table of their own in 1.7.28: the provider stores each one in
 * `verification` under the hashed code, with `value` holding the JSON `authorization_code`
 * record (user id and `query.client_id`). There is no client index, so finding the pending
 * codes for a grant is a paged scan of that table.
 */
import { adapterOf, findAllPages } from "./adapter"

export type GrantOwner = {
	userId: string
	clientId: string
}

type StoredVerification = {
	id: string
	value?: unknown
}

type AuthorizationCodeValue = {
	type?: unknown
	userId?: unknown
	query?: { client_id?: unknown } | null
}

/** Deletes every consent row for one user and client, so a duplicate cannot survive a revoke. */
export async function deleteConsentsForGrant(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "oauthConsent",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
		],
	})
}

export async function deleteConsentRow(ctx: { context: unknown }, id: string): Promise<void> {
	await adapterOf(ctx).delete({
		model: "oauthConsent",
		where: [{ field: "id", value: id }],
	})
}

export async function deleteTokenFamily(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	const adapter = adapterOf(ctx)
	const where = [
		{ field: "clientId", value: owner.clientId },
		{ field: "userId", value: owner.userId },
	]
	await adapter.deleteMany({ model: "oauthAccessToken", where })
	await adapter.deleteMany({ model: "oauthRefreshToken", where })
}

export async function deleteDeviceCodes(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "deviceCode",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
		],
	})
}

export async function deletePendingAuthorizationCodes(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	const adapter = adapterOf(ctx)
	// Collect every match before deleting: offset paging over a table that shrinks underneath it
	// would skip rows. `findAllPages` reads past Better Auth's default 100-row limit.
	const rows = await findAllPages<StoredVerification>(ctx, "verification", [])
	const ids: string[] = []
	for (const row of rows) {
		if (typeof row.id !== "string" || !isAuthorizationCodeFor(row.value, owner)) continue
		ids.push(row.id)
	}
	for (const id of ids) {
		await adapter.delete({
			model: "verification",
			where: [{ field: "id", value: id }],
		})
	}
}

/** True only for an unconsumed authorization code issued to this user and client. */
function isAuthorizationCodeFor(value: unknown, owner: GrantOwner): boolean {
	const parsed = parseAuthorizationCodeValue(value)
	return (
		parsed !== null &&
		parsed.type === "authorization_code" &&
		parsed.userId === owner.userId &&
		parsed.query?.client_id === owner.clientId
	)
}

function parseAuthorizationCodeValue(value: unknown): AuthorizationCodeValue | null {
	if (typeof value !== "string") return null
	try {
		const parsed = JSON.parse(value) as unknown
		return parsed !== null && typeof parsed === "object" ? (parsed as AuthorizationCodeValue) : null
	} catch {
		return null
	}
}
