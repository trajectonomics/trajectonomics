import { randomBytes } from "node:crypto"
import { DEVICE_CODE_GRANT_TYPE } from "./config"
import { approveDevice, requestDeviceCode, tokenRequest } from "./flow"
import type { Session } from "./http"
import {
	COLLECTOR,
	DATA,
	DEFAULT_SCOPE,
	reset,
	revokeAll,
	sql,
	WEB,
	WEB_REDIRECT_URI,
} from "./security-shared"
import { authorizeCode } from "./security-web"
import type { RequestResult } from "./types"

const FILLER_ROWS = 150

/**
 * The fillers' ids start with `!`, which sorts before every Better Auth id, so a paged scan
 * ordered by id reaches them first and the grant's own row sits past the first page. Filler ids
 * like `filler1` would sort after a random id and hide the paging bug.
 */
function fillVerification(scratch: string): void {
	sql(
		scratch,
		`with recursive n(i) as (select 1 union all select i+1 from n where i<${FILLER_ROWS}) insert into verification (id,identifier,value,expiresAt,createdAt,updatedAt) select '!filler'||printf('%04d',i),'filler'||i,'{}','2099-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z' from n`,
	)
}

function pendingAuthCodeCount(scratch: string, clientId: string): number {
	const count = sql(
		scratch,
		`select count(*) as n from verification where value like '%"type":"authorization_code"%' and value like '%${clientId}%'`,
	)[0]?.["n"]
	return Number(count ?? -1)
}

function isInvalidGrant(result: RequestResult): boolean {
	return result.status === 400 && result.body["error"] === "invalid_grant"
}

/**
 * A revoke must page past Better Auth's 100-row `findMany` default: anonymous requests fill
 * `verification`, and a pending authorization code or approved device code past the first page
 * must still die with the grant.
 */
export async function checkRevokeHoldsWithManyVerificationRows(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from verification")
	fillVerification(scratch)
	const verifier = randomBytes(32).toString("base64url")
	const code = await authorizeCode(session, verifier)
	if (code === null) return false
	if (pendingAuthCodeCount(scratch, WEB) < 1) return false
	await revokeAll(session)
	reset(scratch)
	const exchange = await tokenRequest(session, {
		grant_type: "authorization_code",
		code,
		client_id: WEB,
		redirect_uri: WEB_REDIRECT_URI,
		code_verifier: verifier,
	})
	sql(scratch, "delete from verification")
	reset(scratch)
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await approveDevice(session, device.user_code)
	fillVerification(scratch)
	await revokeAll(session)
	reset(scratch)
	const poll = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: device.device_code,
		client_id: COLLECTOR,
	})
	sql(scratch, "delete from verification")
	return isInvalidGrant(exchange) && poll.status !== 200 && poll.body["access_token"] === undefined
}
