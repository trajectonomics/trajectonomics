import { DEVICE_CODE_GRANT_TYPE } from "./config"
import {
	approveDevice,
	listGrants,
	redeemDeviceCode,
	refreshRequest,
	requestDeviceCode,
	tokenRequest,
} from "./flow"
import { json, type Session } from "./http"
import { requestResult } from "./request"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"
import {
	exchangeCode,
	isInvalidGrant,
	issueWebCode,
	revokeWebGrant,
} from "./security-verification-shared"
import type { RequestResult } from "./types"

const TRIGGER = "spike_revoke_fail"

/**
 * A revoke is one atomic D1 batch. A trigger that aborts the refresh-token delete makes the whole
 * batch roll back, including the consents it had already deleted, so the 500 leaves the grant
 * listed and the retry still has something to revoke. After the retry the pending device code and
 * the pending authorization code are both gone, so neither can mint tokens.
 */
export async function checkRevokeRetryAfterPartialFailure(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	sql(scratch, `drop trigger if exists ${TRIGGER}`)
	await revokeAll(session)
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await approveDevice(session, device.user_code)
	const token = await redeemDeviceCode(session, COLLECTOR, device.device_code)
	const pending = await requestDeviceCode(session, COLLECTOR, {
		scope: DEFAULT_SCOPE,
		resources: [DATA],
	})
	await approveDevice(session, pending.user_code)
	const issued = await issueWebCode(session)
	const grantId = await collectorGrant(session)
	const webGrantId = await revokeWebGrant(session)
	if (grantId === null || webGrantId === null || issued === null) return false
	const failed = await armAndFail(session, scratch, grantId)
	const stillListed = (await listGrants(session)).grants.some((grant) => grant.id === grantId)
	if (failed.status !== 500 || !stillListed) return false
	const retried = await revoke(session, grantId)
	const poll = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: pending.device_code,
		client_id: COLLECTOR,
	})
	const refresh = await refreshRequest(session, COLLECTOR, token.refresh_token ?? "")
	const webRevoked = await revoke(session, webGrantId)
	const exchange = await exchangeCode(session, issued)
	await revokeAll(session)
	return (
		retried.status === 200 &&
		poll.status !== 200 &&
		isInvalidGrant(refresh) &&
		webRevoked.status === 200 &&
		isInvalidGrant(exchange)
	)
}

/** Arms the trigger, revokes, and always drops the trigger again. */
async function armAndFail(
	session: Session,
	scratch: string,
	grantId: string,
): Promise<RequestResult> {
	try {
		sql(
			scratch,
			`create trigger ${TRIGGER} before delete on "oauthRefreshToken" when old."clientId" = '${COLLECTOR}' begin select raise(abort, 'spike revoke failure'); end`,
		)
		return await revoke(session, grantId)
	} finally {
		sql(scratch, `drop trigger if exists ${TRIGGER}`)
	}
}

function revoke(session: Session, id: string): Promise<RequestResult> {
	return requestResult(session, "/api/auth/oauth2/grants/revoke", json({ id }))
}

async function collectorGrant(session: Session): Promise<string | null> {
	const grant = (await listGrants(session)).grants.find(
		(candidate) => candidate.clientId === COLLECTOR,
	)
	return grant?.id ?? null
}
