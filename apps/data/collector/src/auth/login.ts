import { COLLECTOR_CLIENT_ID, COLLECTOR_SCOPE, DATA_AUDIENCE } from "./config"
import type { Credentials } from "./credentials"
import { type DeviceCode, parseDeviceCodeResponse } from "./device"
import { awaitTokens, type PollDeps } from "./device-poll"
import { grantStartedAt } from "./grant"
import { postForm, responseBody } from "./http"
import { accountIdOf, type TokenSet } from "./tokens"

/** Everything a login run touches, injected so tests never poll or wait for real. */
export type LoginDeps = PollDeps & {
	save: (credentials: Credentials) => void | Promise<void>
	read: () => Credentials | null
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

async function saveSignIn(
	issuer: string,
	tokens: TokenSet,
	deps: LoginDeps,
): Promise<LoginOutcome> {
	const accountId = accountIdOf(tokens.accessToken)
	const nowIso = new Date(deps.nowMs()).toISOString()
	const credentials: Credentials = {
		version: 1,
		issuer,
		clientId: COLLECTOR_CLIENT_ID,
		accountId,
		refreshToken: tokens.refreshToken,
		grantStartedAt: grantStartedAt(issuer, accountId, nowIso, deps.read),
		refreshedAt: nowIso,
	}
	await deps.save(credentials)
	deps.out(`Signed in. Account id: ${credentials.accountId ?? "unknown"}`)
	return { ok: true, accountId }
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
