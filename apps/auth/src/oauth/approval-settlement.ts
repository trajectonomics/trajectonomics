/**
 * The `/device/approve` after-hook: take back the approval when the endpoint did not finish it.
 *
 * The before-hook writes the consent first, so a request the endpoint refuses (a concurrent
 * approve, a deny, a revoke, an expiry) would otherwise leave a grant the person never approved,
 * and a later authorize would skip the consent page for it. Only the final device-code status
 * decides: an `approved` code owned by the same user keeps the write. The endpoint's own error is
 * never read, because a second approve of the same code fails while that first approval is exactly
 * the consent the grant needs.
 */
import type { D1Database } from "@cloudflare/workers-types"
import { type DeviceApproval, takeDeviceApproval } from "./approval"
import { undoConsentWrite } from "./consent-write"
import { findDeviceCode } from "./store"

export async function settleDeviceApproval(
	ctx: { context: unknown },
	database: D1Database,
): Promise<void> {
	const approval = takeDeviceApproval(ctx)
	if (approval === null || approval.write.kind === "none") return
	if (await approvalHeld(ctx, approval)) return
	await undoConsentWrite(database, approval.write)
}

async function approvalHeld(ctx: { context: unknown }, approval: DeviceApproval): Promise<boolean> {
	const device = await findDeviceCode(ctx, approval.userCode)
	return device !== null && device.status === "approved" && device.userId === approval.userId
}
