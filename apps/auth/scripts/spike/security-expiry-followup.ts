import { randomBytes } from "node:crypto"
import { TEST_USER } from "./config"
import { json, type Session, Session as SpikeSession } from "./http"
import { reset, revokeAll, sql, WEB } from "./security-shared"
import { authorizeCode, authorizeLocation } from "./security-web"

function hasIssuedCode(location: string): boolean {
	try {
		return new URL(location, "http://spike.invalid").searchParams.has("code")
	} catch {
		return false
	}
}

function verifier(): string {
	return randomBytes(32).toString("base64url")
}

function paginateFillerConsents(scratch: string): void {
	sql(
		scratch,
		`with recursive n(i) as (select 1 union all select i+1 from n where i<100) insert into user (id,name,email,emailVerified,createdAt,updatedAt) select 'filler-user-'||i,'filler','filler-'||i||'@example.test',0,'2026-11-01T00:00:00.000Z','2026-11-01T00:00:00.000Z' from n`,
	)
	sql(
		scratch,
		`with recursive n(i) as (select 1 union all select i+1 from n where i<100) insert into oauthConsent (id,clientId,userId,scopes,createdAt,updatedAt) select 'filler-consent-'||i,'${WEB}','filler-user-'||i,'["openid"]','2026-11-26T00:00:00.000Z','2026-11-26T00:00:00.000Z' from n`,
	)
}

function clearFillerConsents(scratch: string): void {
	sql(scratch, "delete from oauthConsent where userId like 'filler-user-%'")
	sql(scratch, "delete from user where id like 'filler-user-%'")
}

/**
 * An expired consent must never issue a code, on the GET authorize path or the internal resume
 * after a sign-in, and 100 consents for other users must not change that. The consent is the
 * session user's own; the filler rows only prove no scan-order accident can hide it.
 */
export async function checkExpiredConsentNeverIssuesCode(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from oauthConsent")
	if ((await authorizeCode(session, verifier())) === null) return false
	const userId = sql(
		scratch,
		`select userId from oauthConsent where clientId='${WEB}' limit 1`,
	)[0]?.["userId"]
	if (typeof userId !== "string") return false
	paginateFillerConsents(scratch)
	sql(scratch, `update oauthConsent set createdAt='2020-01-01T00:00:00.000Z'`)
	reset(scratch)
	const getLocation = await authorizeLocation(session, verifier())
	const getOk = !hasIssuedCode(getLocation) && getLocation.includes("/consent?")
	// Recreate a live consent, age it, then resume the flow through a fresh sign-in.
	if ((await authorizeCode(session, verifier())) === null) return false
	sql(
		scratch,
		`update oauthConsent set createdAt='2020-01-01T00:00:00.000Z' where userId='${userId}'`,
	)
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
	const remaining = sql(
		scratch,
		`select count(*) as n from oauthConsent where clientId='${WEB}' and userId='${userId}'`,
	)[0]?.["n"]
	clearFillerConsents(scratch)
	await revokeAll(session)
	return (
		getOk &&
		!hasIssuedCode(resumeLocation) &&
		resumeLocation.includes("/consent?") &&
		Number(remaining) === 0
	)
}

function jsonUrl(body: string): string | null {
	try {
		const parsed = JSON.parse(body) as { url?: unknown }
		return typeof parsed.url === "string" ? parsed.url : null
	} catch {
		return null
	}
}
