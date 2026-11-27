import type { Database } from "bun:sqlite"
import { SPIKE_HOLD_HEADER } from "../../src/oauth/spike-hold"
import { openScratchDatabase } from "./database"
import { listGrants, redeemDeviceCode, refreshRequest, requestDeviceCode } from "./flow"
import type { Session } from "./http"
import { requestResult } from "./request"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"

/**
 * The double submit that used to delete the grant it had just approved: request A's before-hook
 * writes the consent and parks, B approves the same code (200), and A's endpoint then refuses the
 * already-processed code (400). A's after-hook must read the code's final status and keep the
 * consent. Nothing else may undo it: the poll mints a token, the grant stays listed, and its first
 * refresh works.
 */
export async function checkFailedDoubleApproveKeepsConsent(
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
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(device.user_code)}`)
	const database = openScratchDatabase(scratch)
	try {
		const parked = requestResult(
			session,
			"/api/auth/device/approve",
			parkedApproval(device.user_code),
		)
		const wrote = await waitForConsent(database, COLLECTOR)
		const second = await requestResult(session, "/api/auth/device/approve", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ userCode: device.user_code }),
		})
		const first = await parked
		const consents = countConsents(database, COLLECTOR)
		const token = await redeemDeviceCode(session, COLLECTOR, device.device_code).catch(() => null)
		const grants = (await listGrants(session)).grants.filter(
			(grant) => grant.clientId === COLLECTOR,
		)
		const refreshed = await refreshRequest(session, COLLECTOR, token?.refresh_token ?? "")
		await revokeAll(session)
		return (
			wrote &&
			first.status === 400 &&
			second.status === 200 &&
			consents === 1 &&
			token !== null &&
			grants.length === 1 &&
			refreshed.status === 200
		)
	} finally {
		database.close()
	}
}

function parkedApproval(userCode: string): RequestInit {
	return {
		method: "POST",
		headers: { "content-type": "application/json", [SPIKE_HOLD_HEADER]: "1" },
		body: JSON.stringify({ userCode }),
	}
}

/** A's before-hook writes the consent before A parks, so the row appears within one hold poll. */
async function waitForConsent(database: Database, clientId: string): Promise<boolean> {
	for (let attempt = 0; attempt < 200; attempt += 1) {
		if (countConsents(database, clientId) > 0) return true
		await Bun.sleep(25)
	}
	return false
}

function countConsents(database: Database, clientId: string): number {
	const row = database
		.query("select count(*) as n from oauthConsent where clientId = ?")
		.get(clientId) as { n?: number } | null
	return Number(row?.n ?? -1)
}
