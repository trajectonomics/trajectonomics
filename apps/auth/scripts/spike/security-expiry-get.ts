import { TEST_USER } from "./config"
import { json, type Session, Session as SpikeSession } from "./http"
import { ageConsent, hasIssuedCode, jsonUrl, verifier } from "./security-expiry-shared"
import { reset, sql } from "./security-shared"
import { authorizeCode, authorizeLocation } from "./security-web"

/** The GET authorize and the internal resume after a sign-in both refuse the expired grant. */
export async function expiredConsentBlocksAuthorize(
	session: Session,
	scratch: string,
	userId: string,
): Promise<boolean> {
	sql(scratch, `update oauthConsent set createdAt='2020-01-01T00:00:00.000Z'`)
	reset(scratch)
	const getLocation = await authorizeLocation(session, verifier())
	const getOk = !hasIssuedCode(getLocation) && getLocation.includes("/consent?")
	// Recreate a live consent, age it, then resume the flow through a fresh sign-in.
	if ((await authorizeCode(session, verifier())) === null) return false
	ageConsent(scratch, userId)
	const loggedOut = new SpikeSession()
	const loginLocation = await authorizeLocation(loggedOut, verifier())
	if (!loginLocation.includes("/sign-in?")) return false
	const signedQuery = loginLocation.slice(loginLocation.indexOf("?") + 1)
	const response = await loggedOut.request("/api/auth/sign-in/email", {
		...json({ ...TEST_USER, oauth_query: signedQuery }),
		headers: { "content-type": "application/json", accept: "application/json" },
	})
	const body = await response.text()
	const resumeLocation = jsonUrl(body) ?? response.headers.get("location") ?? ""
	return getOk && !hasIssuedCode(resumeLocation) && resumeLocation.includes("/consent?")
}
