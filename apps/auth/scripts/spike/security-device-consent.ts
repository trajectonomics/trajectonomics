import { DEVICE_CODE_GRANT_TYPE } from "./config"
import { listGrants, requestDeviceCode, tokenRequest } from "./flow"
import { json, type Session } from "./http"
import { requestResult } from "./request"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"

const TRIGGER = "spike_consent_before_approve"

function updateFails(scratch: string, command: string): boolean {
	try {
		sql(scratch, command)
		return false
	} catch {
		return true
	}
}

/**
 * A database trigger refuses to mark a device code `approved` unless a consent row already exists
 * for its client and user. The approval therefore only succeeds when the before-hook wrote the
 * consent first, which is exactly the ordering a poll races.
 */
export async function checkDeviceConsentExistsBeforeRedeem(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, `drop trigger if exists ${TRIGGER}`)
	sql(
		scratch,
		`create trigger ${TRIGGER} before update of status on deviceCode when new.status = 'approved' begin select raise(abort, 'consent must exist before approval') where not exists (select 1 from oauthConsent where clientId = new.clientId and userId = new.userId); end`,
	)
	try {
		// Prove the trigger is armed: an approval with no consent must be refused. The throwaway
		// code is deleted afterwards, so the real flow starts clean.
		const throwaway = await requestDeviceCode(session, COLLECTOR, {
			scope: DEFAULT_SCOPE,
			resources: [DATA],
		})
		const armed = updateFails(
			scratch,
			`update deviceCode set status='approved' where deviceCode='${throwaway.device_code}'`,
		)
		sql(scratch, `delete from deviceCode where deviceCode='${throwaway.device_code}'`)
		if (!armed) return false
		const device = await requestDeviceCode(session, COLLECTOR, {
			scope: DEFAULT_SCOPE,
			resources: [DATA],
		})
		await session.json(`/api/auth/device?user_code=${encodeURIComponent(device.user_code)}`)
		const beforeApproval = (await listGrants(session)).grants.some(
			(grant) => grant.clientId === COLLECTOR,
		)
		if (beforeApproval) return false
		const approval = await requestResult(
			session,
			"/api/auth/device/approve",
			json({ userCode: device.user_code }),
		)
		reset(scratch)
		const poll = await tokenRequest(session, {
			grant_type: DEVICE_CODE_GRANT_TYPE,
			device_code: device.device_code,
			client_id: COLLECTOR,
		})
		const consent = (await listGrants(session)).grants.some((grant) => grant.clientId === COLLECTOR)
		return approval.status === 200 && poll.status === 200 && consent
	} finally {
		sql(scratch, `drop trigger if exists ${TRIGGER}`)
	}
}

/**
 * A second approval of the same client must keep the first approval's scopes and add the new
 * ones, on one row. Narrowing the row would lock a machine out of what another machine approved.
 */
export async function checkConsentScopesAreUnionOnApproval(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from oauthConsent")
	const first = await requestDeviceCode(session, COLLECTOR, {
		scope: "openid offline_access",
		resources: [DATA],
	})
	const second = await requestDeviceCode(session, COLLECTOR, {
		scope: "openid data:ingest",
		resources: [DATA],
	})
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(first.user_code)}`)
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(second.user_code)}`)
	const approvals = [
		await requestResult(session, "/api/auth/device/approve", json({ userCode: first.user_code })),
		await requestResult(session, "/api/auth/device/approve", json({ userCode: second.user_code })),
	]
	const rows = sql(
		scratch,
		`select count(*) as n from oauthConsent where clientId='${COLLECTOR}'`,
	)[0]?.["n"]
	const scopes = (await listGrants(session)).grants
		.filter((grant) => grant.clientId === COLLECTOR)
		.flatMap((grant) => grant.scopes)
	await revokeAll(session)
	return (
		approvals.every((approval) => approval.status === 200) &&
		Number(rows) === 1 &&
		["openid", "offline_access", "data:ingest"].every((scope) => scopes.includes(scope))
	)
}
