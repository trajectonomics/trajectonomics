import type { Session } from "./http"
import { expiredConsentBlocksContinue } from "./security-expiry-continue"
import { expiredConsentBlocksAuthorize } from "./security-expiry-get"
import { verifier } from "./security-expiry-shared"
import { reset, revokeAll, sql, WEB } from "./security-shared"
import { authorizeCode } from "./security-web"

/**
 * An expired consent must never issue a code on any of the three paths that can: the GET
 * authorize, the internal resume after a sign-in, and `/oauth2/continue`. 100 consents for other
 * users must not change that; they only prove no scan-order accident can hide the user's own row.
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
	const authorizeOk = await expiredConsentBlocksAuthorize(session, scratch, userId)
	const continueOk = await expiredConsentBlocksContinue(session, scratch, userId)
	clearFillerConsents(scratch)
	await revokeAll(session)
	return authorizeOk && continueOk
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
