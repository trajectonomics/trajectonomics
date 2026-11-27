import { DEVICE_CODE_GRANT_TYPE } from "./config"
import { json, type Session } from "./http"
import { formWithResources, requestResult } from "./request"
import { tokenRequest } from "./token"
import type { DeviceCodeInput, DeviceCodeResponse, RequestResult, TokenResponse } from "./types"

export async function deviceCodeRequest(
	session: Session,
	clientId: string,
	input: DeviceCodeInput = {},
): Promise<RequestResult> {
	return requestResult(
		session,
		"/api/auth/device/code",
		formWithResources(
			{ client_id: clientId, ...(input.scope === undefined ? {} : { scope: input.scope }) },
			input.resources,
		),
	)
}

export async function requestDeviceCode(
	session: Session,
	clientId: string,
	input: DeviceCodeInput = {},
): Promise<DeviceCodeResponse> {
	const result = await deviceCodeRequest(session, clientId, input)
	if (result.status !== 200) {
		throw new Error(`device code -> ${result.status}: ${JSON.stringify(result.body)}`)
	}
	return result.body as DeviceCodeResponse
}

/** The first poll, before approval, must report `authorization_pending` per RFC 8628. */
export async function pollWhilePending(
	session: Session,
	clientId: string,
	deviceCode: string,
): Promise<string> {
	const result = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: deviceCode,
		client_id: clientId,
	})
	return typeof result.body["error"] === "string" ? result.body["error"] : "unexpected-success"
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
	const result = await tokenRequest(session, {
		grant_type: DEVICE_CODE_GRANT_TYPE,
		device_code: deviceCode,
		client_id: clientId,
	})
	if (result.status !== 200) {
		throw new Error(`device token -> ${result.status}: ${JSON.stringify(result.body)}`)
	}
	return result.body as TokenResponse
}
