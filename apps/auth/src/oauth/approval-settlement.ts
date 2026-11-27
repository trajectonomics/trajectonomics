/**
 * The `/device/approve` after-hook: take back the approval when the endpoint did not finish it.
 *
 * The before-hook writes the consent first, so a request the endpoint refuses (a concurrent deny,
 * a revoke that removed the code, an expiry) would otherwise leave a grant the person never
 * approved, and a later authorize would skip the consent page for it. The final device-code status
 * decides: only an `approved` code owned by the same user keeps the write.
 */
import { isAPIError } from "better-auth/api"
import { type DeviceApproval, takeDeviceApproval } from "./approval"
import { undoConsentWrite } from "./consent-write"
import { findDeviceCode } from "./store"

export async function settleDeviceApproval(ctx: { context: unknown }): Promise<void> {
	const approval = takeDeviceApproval(ctx)
	if (approval === null) return
	if (await approvalHeld(ctx, approval)) return
	await undoConsentWrite(ctx, approval.write)
}

async function approvalHeld(ctx: { context: unknown }, approval: DeviceApproval): Promise<boolean> {
	if (isAPIError((ctx.context as { returned?: unknown }).returned)) return false
	const device = await findDeviceCode(ctx, approval.userCode)
	return device !== null && device.status === "approved" && device.userId === approval.userId
}
