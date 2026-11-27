import { randomBytes } from "node:crypto"
import { listGrants, tokenRequest } from "./flow"
import type { Session } from "./http"
import {
	COLLECTOR,
	DATA,
	newGrant,
	reset,
	revokeAll,
	sql,
	WEB,
	WEB_REDIRECT_URI,
} from "./security-shared"
import { authorizeCode } from "./security-web"
import type { RequestResult } from "./types"

function isInvalidGrant(result: RequestResult): boolean {
	return result.status === 400 && result.body["error"] === "invalid_grant"
}

/** Device re-approval after the ninety-day expiry, and the interactive equivalent. */
export async function checkReapprovalAfterExpiry(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const first = await newGrant(session, [DATA])
	sql(scratch, "update oauthConsent set createdAt='2026-01-01T00:00:00.000Z'")
	const second = await newGrant(session, [DATA])
	const refreshed = await tokenRequest(session, {
		grant_type: "refresh_token",
		refresh_token: second.refresh_token ?? "",
		client_id: COLLECTOR,
	})
	const old = await tokenRequest(session, {
		grant_type: "refresh_token",
		refresh_token: first.refresh_token ?? "",
		client_id: COLLECTOR,
	})
	const deviceOk = refreshed.status === 200 && old.status === 400
	await revokeAll(session)
	const verifier = randomBytes(32).toString("base64url")
	if ((await authorizeCode(session, verifier)) === null) return false
	sql(scratch, "update oauthConsent set createdAt='2026-01-01T00:00:00.000Z'")
	if ((await authorizeCode(session, verifier)) === null) return false
	const webGrant = (await listGrants(session)).grants.find((grant) => grant.clientId === WEB)
	const createdAt = Date.parse(webGrant?.createdAt ?? "")
	const interactiveOk = Number.isFinite(createdAt) && createdAt > Date.now() - 60 * 60 * 1_000
	await revokeAll(session)
	return deviceOk && interactiveOk
}

/** Revoking the consent also deletes the authorization code that is still pending. */
export async function checkRevokeKillsPendingAuthCode(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const verifier = randomBytes(32).toString("base64url")
	const code = await authorizeCode(session, verifier)
	if (code === null) return false
	await revokeAll(session)
	reset(scratch)
	const exchange = await tokenRequest(session, {
		grant_type: "authorization_code",
		code,
		client_id: WEB,
		redirect_uri: WEB_REDIRECT_URI,
		code_verifier: verifier,
	})
	return isInvalidGrant(exchange)
}
