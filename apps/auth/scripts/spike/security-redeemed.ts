import type { Database } from "bun:sqlite"
import { SPIKE_HOLD_AFTER } from "../../src/oauth/spike-hold"
import { openScratchDatabase } from "./database"
import { listGrants, redeemDeviceCode, refreshRequest, requestDeviceCode } from "./flow"
import type { Session } from "./http"
import { parkedApproval, waitUntil } from "./security-hold"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"

/**
 * A poll can redeem an approved code before the approval's after-hook runs, and the library then
 * deletes the code's row. The approval still succeeded: the grant stays listed with every scope
 * and its refresh works. Run twice, for a created consent and for a merge that adds a scope.
 */
export async function checkRedeemedBeforeSettlementKeepsConsent(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from oauthConsent")
	const database = openScratchDatabase(scratch)
	try {
		const created = await redeemWhileParked(session, database, "openid offline_access")
		const merged = await redeemWhileParked(session, database, DEFAULT_SCOPE)
		await revokeAll(session)
		return created && merged
	} finally {
		database.close()
	}
}

async function redeemWhileParked(
	session: Session,
	database: Database,
	scope: string,
): Promise<boolean> {
	const device = await requestDeviceCode(session, COLLECTOR, { scope, resources: [DATA] })
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(device.user_code)}`)
	let answered = false
	const parked = parkedApproval(session, device.user_code, SPIKE_HOLD_AFTER).finally(() => {
		answered = true
	})
	const approved = await waitUntil(() => codeStatus(database, device.user_code) === "approved")
	// Long enough for an approval that did not park to have answered.
	await Bun.sleep(500)
	const held = !answered
	const token = await redeemDeviceCode(session, COLLECTOR, device.device_code)
	const approval = await parked
	const grants = (await listGrants(session)).grants.filter((grant) => grant.clientId === COLLECTOR)
	const refreshed = await refreshRequest(session, COLLECTOR, token.refresh_token ?? "")
	const wanted = scope.split(" ")
	const listed = grants[0]?.scopes ?? []
	const issued = String(refreshed.body["scope"] ?? "").split(" ")
	return (
		approved &&
		held &&
		approval.status === 200 &&
		grants.length === 1 &&
		wanted.every((value) => listed.includes(value)) &&
		refreshed.status === 200 &&
		wanted.every((value) => issued.includes(value))
	)
}

function codeStatus(database: Database, userCode: string): string | undefined {
	const row = database.query("select status from deviceCode where userCode = ?").get(userCode) as {
		status?: string
	} | null
	return row?.status
}
