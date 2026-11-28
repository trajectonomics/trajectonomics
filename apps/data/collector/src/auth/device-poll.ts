import { COLLECTOR_CLIENT_ID } from "./config"
import { type DeviceCode, type PollDecision, pollDecision } from "./device"
import { type AuthFetch, postForm, responseBody } from "./http"
import type { TokenSet } from "./tokens"

/** The clock, wait and network one device poll touches. */
export type PollDeps = {
	fetch: AuthFetch
	sleep: (milliseconds: number) => Promise<void>
	nowMs: () => number
}

/** What a completed poll produced. */
export type PollOutcome = { ok: true; tokens: TokenSet } | { ok: false; message: string }

const EXPIRED = { ok: false, message: "the code expired; run login again" } as const

/** RFC 8628 §3.5: a network failure waits longer and polling continues. */
const TRANSIENT_EXTRA_SECONDS = 5

async function pollOnce(
	issuer: string,
	deviceCode: string,
	intervalSeconds: number,
	deps: PollDeps,
): Promise<PollDecision> {
	const response = await postForm(deps.fetch, `${issuer}/api/auth/oauth2/token`, {
		grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		device_code: deviceCode,
		client_id: COLLECTOR_CLIENT_ID,
	})
	return pollDecision(response.status, await responseBody(response), intervalSeconds)
}

/** Waits out the polling interval until the code is approved, denied or expires. */
export async function awaitTokens(
	issuer: string,
	device: DeviceCode,
	deps: PollDeps,
): Promise<PollOutcome> {
	const expiresAtMs = deps.nowMs() + device.expiresIn * 1000
	let interval = device.intervalSeconds
	while (deps.nowMs() < expiresAtMs) {
		await deps.sleep(interval * 1000)
		if (deps.nowMs() >= expiresAtMs) break
		let decision: PollDecision
		try {
			decision = await pollOnce(issuer, device.deviceCode, interval, deps)
		} catch {
			decision = { kind: "wait", intervalSeconds: interval + TRANSIENT_EXTRA_SECONDS }
		}
		if (decision.kind === "tokens") return { ok: true, tokens: decision.tokens }
		if (decision.kind === "fail") return { ok: false, message: decision.message }
		interval = decision.intervalSeconds
	}
	return EXPIRED
}
