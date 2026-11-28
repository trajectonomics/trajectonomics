import type { Credentials } from "../../src/auth/credentials"
import type { AuthFetch, AuthInit } from "../../src/auth/http"

/** A synthetic unsigned JWT; its signature is never verified here. */
export function fakeJwt(payload: Record<string, unknown>): string {
	const part = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url")
	return `${part({ alg: "EdDSA" })}.${part(payload)}.c2ln`
}

export const ACCOUNT_ID = "user-synthetic-1"
export const ACCESS_TOKEN = "at-test-1"
export const ROTATED_ACCESS = "at-test-2"
export const REFRESH_TOKEN = "rt-test-1"
export const ROTATED_REFRESH = "rt-test-2"
export const DEVICE_CODE = "device-code-secret"

/** Synthetic credentials; every field can be overridden. */
export function credentials(overrides: Partial<Credentials> = {}): Credentials {
	return {
		version: 1,
		issuer: "https://auth.synthetic.test",
		clientId: "traj-data-collector",
		accountId: ACCOUNT_ID,
		refreshToken: REFRESH_TOKEN,
		grantStartedAt: "2026-11-01T00:00:00.000Z",
		refreshedAt: "2026-11-01T00:00:00.000Z",
		...overrides,
	}
}

/** A token response, with every field overridable. */
export function tokenBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		access_token: ACCESS_TOKEN,
		refresh_token: REFRESH_TOKEN,
		expires_in: 900,
		token_type: "Bearer",
		scope: "openid offline_access data:ingest",
		...overrides,
	}
}

/** A device authorization response for the fake fetch queue. */
export function deviceBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		device_code: DEVICE_CODE,
		user_code: "ABCD-EFGH",
		verification_uri: "https://auth.synthetic.test/device",
		verification_uri_complete: "https://auth.synthetic.test/device?user_code=ABCD-EFGH",
		expires_in: 900,
		interval: 5,
		...overrides,
	}
}

export type Reply = { status: number; body: unknown } | Error

/** A fetch that answers a queue of replies and records every request. */
export function queueFetch(replies: readonly Reply[]) {
	const calls: { url: string; init: AuthInit }[] = []
	const remaining = [...replies]
	const fetch: AuthFetch = async (url, init) => {
		calls.push({ url, init })
		const reply = remaining.shift()
		if (reply === undefined) throw new Error("synthetic fetch queue is empty")
		if (reply instanceof Error) throw reply
		return {
			ok: reply.status >= 200 && reply.status < 300,
			status: reply.status,
			json: async () => reply.body,
		}
	}
	return { calls, fetch, remaining }
}

/** The form fields of one recorded request. */
export function formFields(call: { init: { body: string } }): Record<string, string> {
	return Object.fromEntries(new URLSearchParams(call.init.body))
}
