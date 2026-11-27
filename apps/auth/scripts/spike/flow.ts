import { DATA_AUDIENCE } from "../../src/auth"
import { DEVICE_CODE_GRANT_TYPE, SCOPES, TEST_CLIENT, TEST_USER } from "./config"
import { form, json, type Session } from "./http"

export type DeviceCodeResponse = {
	device_code: string
	user_code: string
	verification_uri: string
	verification_uri_complete: string
	expires_in: number
	interval: number
}

export type TokenResponse = {
	access_token: string
	refresh_token?: string
	expires_in: number
	token_type: string
	scope: string
	id_token?: string
	[key: string]: unknown
}

export async function signUp(session: Session): Promise<Record<string, unknown>> {
	return session.json("/api/auth/sign-up/email", json(TEST_USER))
}

export async function createClient(session: Session): Promise<{ client_id: string }> {
	return session.json(
		"/api/auth/oauth2/create-client",
		json({
			client_name: TEST_CLIENT.clientName,
			redirect_uris: [TEST_CLIENT.redirectUri],
			application_type: "native",
			token_endpoint_auth_method: "none",
			grant_types: TEST_CLIENT.grantTypes,
			scope: TEST_CLIENT.scopes,
		}),
	)
}

export async function requestDeviceCode(
	session: Session,
	clientId: string,
): Promise<DeviceCodeResponse> {
	return session.json(
		"/api/auth/device/code",
		form({
			client_id: clientId,
			scope: SCOPES,
			resource: DATA_AUDIENCE,
		}),
	)
}

/** The first poll, before approval, must report `authorization_pending` per RFC 8628. */
export async function pollWhilePending(
	session: Session,
	clientId: string,
	deviceCode: string,
): Promise<string> {
	const response = await session.request(
		"/api/auth/oauth2/token",
		form({
			grant_type: DEVICE_CODE_GRANT_TYPE,
			device_code: deviceCode,
			client_id: clientId,
		}),
	)
	const body = (await response.json()) as Record<string, unknown>
	return typeof body["error"] === "string" ? body["error"] : "unexpected-success"
}

/** The signed-in user claims the code, then approves it. */
export async function approveDevice(session: Session, userCode: string): Promise<void> {
	await session.json(`/api/auth/device?user_code=${encodeURIComponent(userCode)}`)
	await session.json("/api/auth/device/approve", json({ userCode }))
}

export async function redeemDeviceCode(
	session: Session,
	clientId: string,
	deviceCode: string,
): Promise<TokenResponse> {
	return session.json(
		"/api/auth/oauth2/token",
		form({
			grant_type: DEVICE_CODE_GRANT_TYPE,
			device_code: deviceCode,
			client_id: clientId,
		}),
	)
}

export async function refresh(
	session: Session,
	clientId: string,
	refreshToken: string,
): Promise<TokenResponse> {
	return session.json(
		"/api/auth/oauth2/token",
		form({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }),
	)
}
