import type { Database } from "bun:sqlite"
import { SPIKE_HOLD_BEFORE } from "../../src/oauth/spike-hold"
import { openScratchDatabase } from "./database"
import { approveDevice, listGrants, requestDeviceCode } from "./flow"
import { json, type Session } from "./http"
import { requestResult } from "./request"
import { countConsents, parkedApproval, waitUntil } from "./security-hold"
import { COLLECTOR, DATA, DEFAULT_SCOPE, reset, revokeAll, sql } from "./security-shared"

type ConsentRow = { scopes: string; resources: string | null; updatedAt: string }

/**
 * An approval that fails leaves nothing behind. The code is denied while the approval is parked
 * after its consent write, so the endpoint refuses it. A created consent is deleted; a merged one
 * gets its previous scopes and resources back, with an `updatedAt` later than the one before the
 * merge.
 */
export async function checkFailedApprovalUndoesConsent(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from oauthConsent")
	const database = openScratchDatabase(scratch)
	try {
		const wroteNew = () => countConsents(database, COLLECTOR) > 0
		const created = await denyWhileParked(session, DEFAULT_SCOPE, wroteNew)
		const leftAfterCreate = countConsents(database, COLLECTOR)
		const base = await requestDeviceCode(session, COLLECTOR, {
			scope: "openid offline_access",
			resources: [DATA],
		})
		await approveDevice(session, base.user_code)
		const before = consentRow(database)
		const wroteMerge = () => (consentRow(database)?.scopes ?? "").includes("data:ingest")
		const merged = await denyWhileParked(session, "openid data:ingest", wroteMerge)
		const after = consentRow(database)
		const listed = (await listGrants(session)).grants.flatMap((grant) => grant.scopes)
		await revokeAll(session)
		return (
			created &&
			leftAfterCreate === 0 &&
			merged &&
			before !== undefined &&
			restored(after, before) &&
			!listed.includes("data:ingest")
		)
	} finally {
		database.close()
	}
}

/** True when the previous scopes and resources are back and the stamp moved forward. */
function restored(after: ConsentRow | undefined, before: ConsentRow): boolean {
	return (
		after !== undefined &&
		after.scopes === before.scopes &&
		after.resources === before.resources &&
		after.updatedAt > before.updatedAt
	)
}

/** True when the parked write showed, the deny landed and the endpoint then refused the code. */
async function denyWhileParked(
	session: Session,
	scope: string,
	wrote: () => boolean,
): Promise<boolean> {
	const device = await requestDeviceCode(session, COLLECTOR, { scope, resources: [DATA] })
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(device.user_code)}`)
	const parked = parkedApproval(session, device.user_code, SPIKE_HOLD_BEFORE)
	const seen = await waitUntil(wrote)
	const denied = await requestResult(
		session,
		"/api/auth/device/deny",
		json({ userCode: device.user_code }),
	)
	const approval = await parked
	return (
		seen &&
		denied.status === 200 &&
		approval.status === 400 &&
		approval.body["error_description"] === "Device code already processed"
	)
}

function consentRow(database: Database): ConsentRow | undefined {
	return database
		.query("select scopes, resources, updatedAt from oauthConsent where clientId = ?")
		.get(COLLECTOR) as ConsentRow | undefined
}
