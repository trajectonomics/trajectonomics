import type { ConsentResult, DeviceLookup, PublicClient } from "../lib/api-types"
import { request } from "./auth"

export async function lookupDevice(userCode: string): Promise<DeviceLookup> {
	return request<DeviceLookup>("/device", { query: { user_code: userCode } })
}

export async function approveDevice(userCode: string): Promise<void> {
	await request("/device/approve", { method: "POST", body: { userCode } })
}

export async function denyDevice(userCode: string): Promise<void> {
	await request("/device/deny", { method: "POST", body: { userCode } })
}

export async function getPublicClient(clientId: string): Promise<PublicClient> {
	return request<PublicClient>("/oauth2/public-client", { query: { client_id: clientId } })
}

/** The app's display name, or undefined when the client cannot be read. */
export async function clientNameOf(clientId: string): Promise<string | undefined> {
	try {
		return (await getPublicClient(clientId)).client_name
	} catch {
		return undefined
	}
}

export async function sendConsent(accept: boolean): Promise<ConsentResult> {
	return request<ConsentResult>("/oauth2/consent", { method: "POST", body: { accept } })
}

export async function continueOAuth(): Promise<ConsentResult> {
	return request<ConsentResult>("/oauth2/continue", { method: "POST", body: { postLogin: true } })
}
