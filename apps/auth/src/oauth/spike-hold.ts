/**
 * The spike's approval holds: two dev-only pauses inside `/device/approve`.
 *
 * `x-spike-hold: 1` parks between the before-hook that writes the consent and the endpoint that
 * flips the code. The failed-approval cases need one request to be slow exactly there, then a
 * second request to approve or deny the same code, then the first endpoint to refuse it.
 *
 * `x-spike-hold: after` parks inside the after-hook, before it settles, until a poll redeemed the
 * code and the library deleted its row.
 *
 * A Worker has no other wait to offer, so each hold polls the code. The header is only read when
 * `spikeHold` is on, which the dev sign-in gate alone turns on: `ENVIRONMENT=development`,
 * `DEV_ONLY=true` and a loopback `BETTER_AUTH_URL`. Production config can satisfy none of the
 * three.
 */
import type { OAuthHookOptions } from "./request"
import { findDeviceCode, type StoredDeviceCode } from "./store"
import { readField } from "./values"

/** The header the spike sends on the request it wants parked. */
export const SPIKE_HOLD_HEADER = "x-spike-hold"
/** Its value for a pause before the endpoint. */
export const SPIKE_HOLD_BEFORE = "1"
/** Its value for a pause in the after-hook. */
export const SPIKE_HOLD_AFTER = "after"

/** Twenty seconds at fifty milliseconds, comfortably longer than one approval takes. */
const SPIKE_HOLD_ATTEMPTS = 400
const SPIKE_HOLD_INTERVAL_MS = 50

type HoldContext = { context: unknown; headers?: Headers | undefined }

/** True only when a dev sign-in deployment may park one approval for the spike. */
export function spikeHoldEnabled(devSignIn: boolean): boolean {
	return devSignIn
}

/** Parks this approval until the same code leaves `pending`, or the wait times out. */
export async function holdDeviceApproval(
	ctx: HoldContext,
	options: OAuthHookOptions,
	userCode: string,
): Promise<void> {
	if (!holdRequested(ctx, options, SPIKE_HOLD_BEFORE)) return
	await pollWhile(ctx, userCode, (device) => device?.status === "pending")
}

/** Parks the after-hook until the approved code is redeemed, or the wait times out. */
export async function holdDeviceSettlement(
	ctx: HoldContext & { body?: unknown },
	options: OAuthHookOptions,
): Promise<void> {
	if (!holdRequested(ctx, options, SPIKE_HOLD_AFTER)) return
	const userCode = readField(ctx.body, "userCode")
	if (typeof userCode !== "string") return
	await pollWhile(ctx, userCode, (device) => device !== null)
}

function holdRequested(ctx: HoldContext, options: OAuthHookOptions, value: string): boolean {
	return options.spikeHold && ctx.headers?.get(SPIKE_HOLD_HEADER) === value
}

async function pollWhile(
	ctx: HoldContext,
	userCode: string,
	waiting: (device: StoredDeviceCode | null) => boolean,
): Promise<void> {
	for (let attempt = 0; attempt < SPIKE_HOLD_ATTEMPTS; attempt += 1) {
		if (!waiting(await findDeviceCode(ctx, userCode))) return
		await new Promise<void>((resolve) => setTimeout(() => resolve(), SPIKE_HOLD_INTERVAL_MS))
	}
}
