import { listGrants, requestDeviceCode } from "./flow"
import { json, type Session } from "./http"
import { requestResult } from "./request"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"

/**
 * An approval body with a signed query is refused before any consent is written. The provider's
 * own before-hook would throw `invalid_signature` after ours, and that throw skips the after-hook
 * that takes the consent back.
 */
export async function checkSignedApprovalBodyRejected(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(device.user_code)}`)
	const approval = await requestResult(
		session,
		"/api/auth/device/approve",
		json({ userCode: device.user_code, oauth_query: "client_id=x&sig=bogus" }),
	)
	const consent = (await listGrants(session)).grants.some((grant) => grant.clientId === COLLECTOR)
	const [row] = sql(
		scratch,
		`select status from deviceCode where deviceCode='${device.device_code}'`,
	)
	return approval.status === 400 && !consent && row?.["status"] === "pending"
}
