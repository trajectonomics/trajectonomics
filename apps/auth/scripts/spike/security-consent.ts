import { randomBytes } from "node:crypto"
import { DEVICE_CODE_GRANT_TYPE } from "./config"
import { approveDevice, listGrants, refreshRequest, requestDeviceCode, tokenRequest } from "./flow"
import type { Session } from "./http"
import {
	COLLECTOR,
	DATA,
	DEFAULT_SCOPE,
	newGrant,
	reset,
	revokeAll,
	sql,
	WEB,
	WEB_REDIRECT_URI,
} from "./security-shared"
import { authorizeCode } from "./security-web"

/** An expired approved code polled after its consent was removed creates no new consent. */
export async function checkExpiredPollCreatesNoConsent(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await approveDevice(session, device.user_code)
	sql(scratch, "delete from oauthConsent")
	sql(
		scratch,
		`update deviceCode set expiresAt='2020-01-01T00:00:00.000Z' where deviceCode='${device.device_code}'`,
	)
	reset(scratch)
	const poll = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: device.device_code,
		client_id: COLLECTOR,
	})
	const grants = await listGrants(session)
	return poll.body["error"] === "expired_token" && grants.grants.length === 0
}

/** A fresh approval deletes the old family, so the old refresh token is dead. */
export async function checkOldTokenNotRevived(session: Session, scratch: string): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const oldGrant = await newGrant(session, [DATA])
	sql(scratch, "delete from oauthConsent")
	const freshGrant = await newGrant(session, [DATA])
	const retry = await refreshRequest(session, COLLECTOR, oldGrant.refresh_token ?? "")
	const deviceOk =
		freshGrant.refresh_token !== undefined &&
		retry.status === 400 &&
		retry.body["error"] === "invalid_grant"
	await revokeAll(session)
	const verifier = randomBytes(32).toString("base64url")
	const code = await authorizeCode(session, verifier)
	if (code === null) return false
	await tokenRequest(session, {
		grant_type: "authorization_code",
		code,
		client_id: WEB,
		redirect_uri: WEB_REDIRECT_URI,
		code_verifier: verifier,
	})
	sql(scratch, `delete from oauthConsent where clientId='${WEB}'`)
	if ((await authorizeCode(session, verifier)) === null) return false
	const rows = sql(scratch, `select count(*) as n from oauthAccessToken where clientId='${WEB}'`)
	const webOk = Number(rows[0]?.["n"] ?? -1) === 0
	await revokeAll(session)
	return deviceOk && webOk
}
