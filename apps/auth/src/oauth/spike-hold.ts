/**
 * The spike's approval hold: a dev-only pause inside `/device/approve`, between the before-hook
 * that writes the consent and the endpoint that flips the code.
 *
 * The double-approval case needs one request to be slow exactly there, then a second request to
 * approve the same code, then the first endpoint to refuse it. A Worker has no other wait to offer,
 * so the first request polls the code it is about to approve until another request moved it off
 * `pending`. The header is only read when `spikeHold` is on, which the dev sign-in gate alone turns
 * on: `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback `BETTER_AUTH_URL`. Production
 * config can satisfy none of the three.
 */
import type { OAuthHookOptions } from "./request"
import { findDeviceCode } from "./store"

/** The header the spike sends on the request it wants parked. */
export const SPIKE_HOLD_HEADER = "x-spike-hold"

/** Twenty seconds at fifty milliseconds, comfortably longer than one approval takes. */
const SPIKE_HOLD_ATTEMPTS = 400
const SPIKE_HOLD_INTERVAL_MS = 50

/** True only when a dev sign-in deployment may park one approval for the spike. */
export function spikeHoldEnabled(devSignIn: boolean): boolean {
	return devSignIn
}

/** Parks this approval until the same code leaves `pending`, or the wait times out. */
export async function holdDeviceApproval(
	ctx: { context: unknown; headers?: Headers | undefined },
	options: OAuthHookOptions,
	userCode: string,
): Promise<void> {
	if (!options.spikeHold) return
	if (ctx.headers?.get(SPIKE_HOLD_HEADER) !== "1") return
	for (let attempt = 0; attempt < SPIKE_HOLD_ATTEMPTS; attempt += 1) {
		const device = await findDeviceCode(ctx, userCode)
		if (device === null || device.status !== "pending") return
		await new Promise<void>((resolve) => setTimeout(() => resolve(), SPIKE_HOLD_INTERVAL_MS))
	}
}
