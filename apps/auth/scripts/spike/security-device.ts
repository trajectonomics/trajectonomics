import { DEVICE_CODE_GRANT_TYPE } from "./config"
import { approveDevice, listGrants, refreshRequest, requestDeviceCode, tokenRequest } from "./flow"
import { json, type Session } from "./http"
import { COLLECTOR, DATA, DEFAULT_SCOPE, newGrant, reset, revokeAll } from "./security-shared"
import type { RequestResult } from "./types"

function isInvalidRequest(result: RequestResult): boolean {
	return result.status === 400 && result.body["error"] === "invalid_request"
}

/** Both paddings, for both the lifetime rule and the widening rule. */
export async function checkPaddedGrantType(session: Session, scratch: string): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const dataGrant = await newGrant(session, [DATA])
	const future = new Date(Date.now() + 91 * 24 * 60 * 60 * 1_000).toISOString()
	const lifetime = [
		await refreshRequest(session, COLLECTOR, dataGrant.refresh_token ?? "", {
			grantType: "refresh_token ",
			now: future,
		}),
		await refreshRequest(session, COLLECTOR, dataGrant.refresh_token ?? "", {
			grantType: "\trefresh_token",
			now: future,
		}),
	]
	const noResourceGrant = await newGrant(session, undefined, "openid offline_access")
	const widening = [
		await refreshRequest(session, COLLECTOR, noResourceGrant.refresh_token ?? "", {
			grantType: "refresh_token ",
			resources: [DATA],
		}),
		await refreshRequest(session, COLLECTOR, noResourceGrant.refresh_token ?? "", {
			grantType: "\trefresh_token",
			resources: [DATA],
		}),
	]
	await revokeAll(session)
	return [...lifetime, ...widening].every(isInvalidRequest)
}

/** approve -> revoke -> poll: the deleted device code cannot mint a token set. */
export async function checkRevokeBeforeRedemption(
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
	await revokeAll(session)
	const poll = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: device.device_code,
		client_id: COLLECTOR,
	})
	const grants = await listGrants(session)
	return (
		poll.status !== 200 &&
		poll.body["access_token"] === undefined &&
		poll.body["refresh_token"] === undefined &&
		grants.grants.length === 0
	)
}

/** Approving `abcd-efgh` (the library's normalized lookup) records the consent. */
export async function checkDashedUserCode(session: Session, scratch: string): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(device.user_code)}`)
	const dashed = `${device.user_code.slice(0, 4)}-${device.user_code.slice(4)}`.toLowerCase()
	await session.json("/api/auth/device/approve", json({ userCode: dashed }))
	const grants = await listGrants(session)
	const created = grants.grants.some((grant) => grant.clientId === COLLECTOR)
	await revokeAll(session)
	return created
}
