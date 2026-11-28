/**
 * The `/device/approve` after-hook: take back the approval when the endpoint failed.
 *
 * The before-hook writes the consent first, so a request the endpoint refuses (a concurrent
 * approve, a deny, a revoke, an expiry) would otherwise leave a grant the person never approved,
 * and a later authorize would skip the consent page for it.
 *
 * A successful answer always keeps the write, and the code is not read: the device may already
 * have redeemed it, which deletes the row. After an error the final device-code status decides,
 * because a second approve of the same code fails while the first approval is exactly the consent
 * the grant needs: an `approved` code owned by the same user keeps the write.
 */
import type { D1Database } from "@cloudflare/workers-types"
import { type DeviceApproval, takeDeviceApproval } from "./approval"
import { undoConsentWrite } from "./consent-write"
import { findDeviceCode } from "./store"

export async function settleDeviceApproval(
	ctx: { context: unknown },
	database: D1Database,
	now: Date,
): Promise<void> {
	const approval = takeDeviceApproval(ctx)
	if (approval === null || approval.write.kind === "none") return
	if (!endpointFailed(ctx)) return
	if (await approvalHeld(ctx, approval)) return
	await undoConsentWrite(database, approval.write, now)
}

/**
 * `context.returned` is the endpoint's answer, set before any after-hook runs: better-auth 1.7.28
 * `dist/api/dispatch.mjs` catches the endpoint's thrown `APIError` as its response (lines
 * 255–260) and stores that error, or the success body, in `returned` (line 264). Any other throw
 * is rethrown at line 261, so no after-hook runs for it.
 */
function endpointFailed(ctx: { context: unknown }): boolean {
	return (ctx.context as { returned?: unknown }).returned instanceof Error
}

async function approvalHeld(ctx: { context: unknown }, approval: DeviceApproval): Promise<boolean> {
	const device = await findDeviceCode(ctx, approval.userCode)
	return device !== null && device.status === "approved" && device.userId === approval.userId
}
