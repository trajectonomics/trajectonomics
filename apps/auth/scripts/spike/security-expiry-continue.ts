import { json, type Session } from "./http"
import { requestResult } from "./request"
import { ageConsent, hasIssuedCode, verifier } from "./security-expiry-shared"
import { reset, sql, WEB } from "./security-shared"
import { authorizeCode, authorizeLocation } from "./security-web"

function consentRows(scratch: string, userId: string): number {
	const row = sql(
		scratch,
		`select count(*) as n from oauthConsent where clientId='${WEB}' and userId='${userId}'`,
	)[0]?.["n"]
	return Number(row ?? -1)
}

/** `/oauth2/continue` resumes the provider's post-login page with the same signed query. */
export async function expiredConsentBlocksContinue(
	session: Session,
	scratch: string,
	userId: string,
): Promise<boolean> {
	sql(scratch, "delete from oauthConsent")
	reset(scratch)
	const consentLocation = await authorizeLocation(session, verifier())
	const signed = consentLocation.includes("/consent?")
		? consentLocation.slice(consentLocation.indexOf("?") + 1)
		: ""
	if (signed === "") return false
	if ((await authorizeCode(session, verifier())) === null) return false
	ageConsent(scratch, userId)
	const continued = await requestResult(
		session,
		"/api/auth/oauth2/continue",
		json({ postLogin: true, oauth_query: signed }),
	)
	const location =
		typeof continued.body["url"] === "string" ? (continued.body["url"] as string) : ""
	return (
		continued.status === 200 &&
		!hasIssuedCode(location) &&
		location.includes("/consent?") &&
		consentRows(scratch, userId) === 0
	)
}
