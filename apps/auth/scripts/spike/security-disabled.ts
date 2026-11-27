import { randomBytes } from "node:crypto"
import { json, type Session } from "./http"
import { requestResult } from "./request"
import { reset, revokeAll, sql, WEB } from "./security-shared"
import { authorizeCode } from "./security-web"

export async function checkDeleteConsentDisabled(session: Session): Promise<boolean> {
	const result = await requestResult(
		session,
		"/api/auth/oauth2/delete-consent",
		json({ id: "not-a-grant" }),
	)
	return result.status === 404
}

/**
 * `/oauth2/update-consent` raises a consent's scopes without the before-hook or the consent page,
 * so the next authorize would issue a code for scopes the person never saw. The disabled path
 * answers 404 and the stored scopes do not move.
 */
export async function checkUpdateConsentDisabled(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	if ((await authorizeCode(session, randomBytes(32).toString("base64url"))) === null) return false
	const row = sql(scratch, `select id, scopes from oauthConsent where clientId='${WEB}' limit 1`)[0]
	if (row === undefined) return false
	const result = await requestResult(
		session,
		"/api/auth/oauth2/update-consent",
		json({ id: row["id"], update: { scopes: ["openid", "profile", "email"] } }),
	)
	const after = sql(scratch, `select scopes from oauthConsent where id='${row["id"]}'`)[0]?.[
		"scopes"
	]
	await revokeAll(session)
	return result.status === 404 && after === row["scopes"]
}
