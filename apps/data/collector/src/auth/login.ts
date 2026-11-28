import { COLLECTOR_CLIENT_ID, COLLECTOR_SCOPE, DATA_AUDIENCE } from "./config"
import type { Credentials } from "./credentials"
import { type DeviceCode, parseDeviceCodeResponse, pollDecision } from "./device"
import { type AuthFetch, postForm, responseBody } from "./http"
import { accountIdOf, type TokenSet } from "./tokens"

const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code"

/** Everything a login run touches, injected so tests never poll or wait for real. */
export type LoginDeps = {
	fetch: AuthFetch
	sleep: (milliseconds: number) => Promise<void>
	nowMs: () => number
	save: (credentials: Credentials) => void | Promise<void>
	log: (line: string) => void
	out: (line: string) => void
}

/** The outcome of one login attempt. */
export type LoginOutcome = { ok: true; accountId: string | null } | { ok: false; message: string }

async function requestDeviceCode(issuer: string, deps: LoginDeps): Promise<DeviceCode> {
	const response = await postForm(deps.fetch, `${issuer}/api/auth/device/code`, {
		client_id: COLLECTOR_CLIENT_ID,
		scope: COLLECTOR_SCOPE,
		resource: DATA_AUDIENCE,
	})
	if (!response.ok) throw new Error(`device code request failed: HTTP ${response.status}`)
	return parseDeviceCodeResponse(await responseBody(response))
}

async function pollOnce(
	issuer: string,
	deviceCode: string,
	intervalSeconds: number,
	deps: LoginDeps,
) {
	const response = await postForm(deps.fetch, `${issuer}/api/auth/oauth2/token`, {
		grant_type: DEVICE_GRANT,
		device_code: deviceCode,
		client_id: COLLECTOR_CLIENT_ID,
	})
	return pollDecision(response.status, await responseBody(response), intervalSeconds)
}

async function saveSignIn(
	issuer: string,
	tokens: TokenSet,
	deps: LoginDeps,
): Promise<LoginOutcome> {
	const nowIso = new Date(deps.nowMs()).toISOString()
	const credentials: Credentials = {
		version: 1,
		issuer,
		clientId: COLLECTOR_CLIENT_ID,
		accountId: accountIdOf(tokens.accessToken),
		refreshToken: tokens.refreshToken,
		grantStartedAt: nowIso,
		refreshedAt: nowIso,
	}
	await deps.save(credentials)
	deps.out(`Signed in. Account id: ${credentials.accountId ?? "unknown"}`)
	return { ok: true, accountId: credentials.accountId }
}

const EXPIRED = { ok: false, message: "the code expired; run login again" } as const

/** Waits out the polling interval until the code is approved, denied or expires. */
async function awaitTokens(
	issuer: string,
	device: DeviceCode,
	deps: LoginDeps,
): Promise<{ ok: true; tokens: TokenSet } | { ok: false; message: string }> {
	const expiresAtMs = deps.nowMs() + device.expiresIn * 1000
	let interval = device.intervalSeconds
	while (deps.nowMs() < expiresAtMs) {
		await deps.sleep(interval * 1000)
		if (deps.nowMs() >= expiresAtMs) break
		const decision = await pollOnce(issuer, device.deviceCode, interval, deps)
		if (decision.kind === "tokens") return { ok: true, tokens: decision.tokens }
		if (decision.kind === "fail") return { ok: false, message: decision.message }
		interval = decision.intervalSeconds
	}
	return EXPIRED
}

/** Runs the device flow to completion, then saves the refresh token. */
export async function login(issuer: string, deps: LoginDeps): Promise<LoginOutcome> {
	let device: DeviceCode
	try {
		device = await requestDeviceCode(issuer, deps)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return { ok: false, message }
	}
	const uri = device.verificationUriComplete ?? device.verificationUri
	deps.log(`Open ${uri} and confirm the code ${device.userCode}.`)
	deps.log("Waiting for approval…")
	const outcome = await awaitTokens(issuer, device, deps)
	return outcome.ok ? saveSignIn(issuer, outcome.tokens, deps) : outcome
}
