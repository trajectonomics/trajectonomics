import type { Database } from "bun:sqlite"
import { SPIKE_HOLD_HEADER } from "../../src/oauth/spike-hold"
import type { Session } from "./http"
import { requestResult } from "./request"
import type { RequestResult } from "./types"

/** An approval the Worker parks where `hold` says; see `src/oauth/spike-hold.ts`. */
export function parkedApproval(
	session: Session,
	userCode: string,
	hold: string,
): Promise<RequestResult> {
	return requestResult(session, "/api/auth/device/approve", {
		method: "POST",
		headers: { "content-type": "application/json", [SPIKE_HOLD_HEADER]: hold },
		body: JSON.stringify({ userCode }),
	})
}

/** Waits up to five seconds for the parked request's own write to show in the database. */
export async function waitUntil(seen: () => boolean): Promise<boolean> {
	for (let attempt = 0; attempt < 200; attempt += 1) {
		if (seen()) return true
		await Bun.sleep(25)
	}
	return false
}

export function countConsents(database: Database, clientId: string): number {
	const row = database
		.query("select count(*) as n from oauthConsent where clientId = ?")
		.get(clientId) as { n?: number } | null
	return Number(row?.n ?? -1)
}
