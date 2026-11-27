/**
 * The approval one `/device/approve` request wrote, carried from its before-hook to its after-hook.
 *
 * The before-hook must write the consent before the endpoint flips the code to `approved`, so the
 * after-hook needs to know what it changed. The marker rides on the endpoint's own context object,
 * which is one per request, under a symbol: no other request can read it, and a concurrent
 * approval cannot overwrite it.
 */
import type { ConsentWrite } from "./consent-write"

export type DeviceApproval = {
	userCode: string
	userId: string
	write: ConsentWrite
}

const marker = Symbol("device-approval")

/** Records the write this request made, for the after-hook. */
export function rememberDeviceApproval(ctx: { context: unknown }, approval: DeviceApproval): void {
	const context = ctx.context
	if (context === null || typeof context !== "object") return
	;(context as Record<PropertyKey, unknown>)[marker] = approval
}

/** Takes the recorded write, if this request made one, and forgets it. */
export function takeDeviceApproval(ctx: { context: unknown }): DeviceApproval | null {
	const context = ctx.context
	if (context === null || typeof context !== "object") return null
	const store = context as Record<PropertyKey, unknown>
	const value = store[marker]
	delete store[marker]
	return isDeviceApproval(value) ? value : null
}

function isDeviceApproval(value: unknown): value is DeviceApproval {
	if (value === null || typeof value !== "object") return false
	const approval = value as DeviceApproval
	return typeof approval.userCode === "string" && typeof approval.userId === "string"
}
