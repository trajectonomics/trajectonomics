import { DATA_AUDIENCE, RELAY_AUDIENCE } from "../../src/core/resources"
import { COLLECTOR_CLIENT_ID, WEB_CLIENT_ID } from "./config"
import { executeSql, resetRateLimits } from "./database"
import { approveDevice, listGrants, redeemDeviceCode, requestDeviceCode, revokeGrant } from "./flow"
import type { Session } from "./http"
import type { TokenResponse } from "./types"

export const DATA = DATA_AUDIENCE
export const RELAY = RELAY_AUDIENCE
export const COLLECTOR = COLLECTOR_CLIENT_ID
export const WEB = WEB_CLIENT_ID
export const WEB_REDIRECT_URI = "https://trajectonomics.com/data/auth/callback"
export const DEFAULT_SCOPE = "openid offline_access data:ingest"

export function reset(scratch: string): void {
	resetRateLimits(scratch)
}

export function sql(scratch: string, command: string): Array<Record<string, unknown>> {
	return executeSql(scratch, command)
}

export async function revokeAll(session: Session): Promise<void> {
	for (const grant of (await listGrants(session)).grants) await revokeGrant(session, grant.id)
}

/** A fresh device grant: request the code, approve it, redeem it. */
export async function newGrant(
	session: Session,
	resources: readonly string[] | undefined,
	scope = DEFAULT_SCOPE,
): Promise<TokenResponse> {
	const device = await requestDeviceCode(session, COLLECTOR, {
		scope,
		...(resources === undefined ? {} : { resources }),
	})
	await approveDevice(session, device.user_code)
	return redeemDeviceCode(session, COLLECTOR, device.device_code)
}
