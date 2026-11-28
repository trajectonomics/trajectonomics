import { DEVICE_CODE_GRANT_TYPE } from "./config"
import {
	approveDevice,
	listGrants,
	redeemDeviceCode,
	refreshRequest,
	requestDeviceCode,
	revokeGrant,
	tokenRequest,
} from "./flow"
import type { Session } from "./http"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"

/** A revoke deletes every consent row for the user and client, not only the id it was given. */
export async function checkRevokeRemovesDuplicateConsents(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from oauthConsent")
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await approveDevice(session, device.user_code)
	const token = await redeemDeviceCode(session, COLLECTOR, device.device_code)
	const userId = sql(
		scratch,
		`select userId from oauthConsent where clientId='${COLLECTOR}' limit 1`,
	)[0]?.["userId"]
	if (typeof userId !== "string") return false
	sql(
		scratch,
		`insert into oauthConsent (id,clientId,userId,scopes,createdAt,updatedAt) values ('duplicate-consent','${COLLECTOR}','${userId}','["openid"]','2026-11-01T00:00:00.000Z','2026-11-01T00:00:00.000Z')`,
	)
	const grants = (await listGrants(session)).grants.filter((grant) => grant.clientId === COLLECTOR)
	if (grants.length < 2 || grants[0] === undefined) return false
	await revokeGrant(session, grants[0].id)
	const remaining = sql(
		scratch,
		`select count(*) as n from oauthConsent where clientId='${COLLECTOR}' and userId='${userId}'`,
	)[0]?.["n"]
	reset(scratch)
	const refresh = await refreshRequest(session, COLLECTOR, token.refresh_token ?? "")
	const poll = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: device.device_code,
		client_id: COLLECTOR,
	})
	return Number(remaining) === 0 && refresh.status === 400 && poll.status !== 200
}
