import { oauthErrorCode } from "./http"
import { parseTokenResponse, type TokenSet } from "./tokens"

/** A device authorization response, as `/device/code` returns it. */
export type DeviceCode = {
	deviceCode: string
	userCode: string
	verificationUri: string
	verificationUriComplete: string | null
	expiresIn: number
	intervalSeconds: number
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

function requiredString(object: JsonObject, key: string): string {
	const value = object[key]
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`device code response has no ${key}`)
	}
	return value
}

function positiveNumber(object: JsonObject, key: string, fallback: number | null): number {
	const value = object[key]
	if (value === undefined && fallback !== null) return fallback
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		throw new Error(`device code response has a bad ${key}`)
	}
	return value
}

/** Validates a device authorization response; the error names the missing field. */
export function parseDeviceCodeResponse(body: unknown): DeviceCode {
	const object = asObject(body)
	if (object === null) throw new Error("device code response is not a JSON object")
	const complete = object["verification_uri_complete"]
	if (complete !== undefined && complete !== null && typeof complete !== "string") {
		throw new Error("device code response has a bad verification_uri_complete")
	}
	return {
		deviceCode: requiredString(object, "device_code"),
		userCode: requiredString(object, "user_code"),
		verificationUri: requiredString(object, "verification_uri"),
		verificationUriComplete: typeof complete === "string" && complete.length > 0 ? complete : null,
		expiresIn: positiveNumber(object, "expires_in", null),
		intervalSeconds: positiveNumber(object, "interval", 5),
	}
}

/** What one token poll means for the device flow. */
export type PollDecision =
	| { kind: "tokens"; tokens: TokenSet }
	| { kind: "wait"; intervalSeconds: number }
	| { kind: "fail"; message: string }

function failure(status: number, body: unknown): PollDecision {
	const code = oauthErrorCode(body)
	const detail = code === null ? `HTTP ${status}` : `HTTP ${status} ${code}`
	return { kind: "fail", message: `sign-in failed: ${detail}` }
}

/** RFC 8628 §3.5: a transient failure waits longer and polling continues. */
const TRANSIENT_EXTRA_SECONDS = 5

function waitLonger(intervalSeconds: number): PollDecision {
	return { kind: "wait", intervalSeconds: intervalSeconds + TRANSIENT_EXTRA_SECONDS }
}

function tokens(body: unknown): PollDecision {
	try {
		return { kind: "tokens", tokens: parseTokenResponse(body) }
	} catch (error) {
		const message = error instanceof Error ? error.message : "token response is malformed"
		return { kind: "fail", message: `sign-in failed: ${message}` }
	}
}

function terminal(code: string | null): PollDecision | null {
	if (code === "access_denied") return { kind: "fail", message: "the sign-in was declined" }
	if (code === "expired_token")
		return { kind: "fail", message: "the code expired; run login again" }
	return null
}

/** Reads one token poll: a grant, another wait (slow_down and transients add 5 s), or a failure. */
export function pollDecision(status: number, body: unknown, intervalSeconds: number): PollDecision {
	if (status >= 200 && status < 300) return tokens(body)
	const code = oauthErrorCode(body)
	const done = terminal(code)
	if (done !== null) return done
	if (status === 429 || status >= 500) return waitLonger(intervalSeconds)
	if (code === "authorization_pending") return { kind: "wait", intervalSeconds }
	if (code === "slow_down") return waitLonger(intervalSeconds)
	return failure(status, body)
}
