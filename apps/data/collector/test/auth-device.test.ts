import { describe, expect, test } from "bun:test"
import { parseDeviceCodeResponse, pollDecision } from "../src/auth/device"
import { ACCESS_TOKEN, deviceBody, REFRESH_TOKEN, tokenBody } from "./support/auth"

describe("parseDeviceCodeResponse", () => {
	test("reads a complete response", () => {
		expect(parseDeviceCodeResponse(deviceBody())).toEqual({
			deviceCode: "device-code-secret",
			userCode: "ABCD-EFGH",
			verificationUri: "https://auth.synthetic.test/device",
			verificationUriComplete: "https://auth.synthetic.test/device?user_code=ABCD-EFGH",
			expiresIn: 900,
			intervalSeconds: 5,
		})
	})

	test("defaults the interval and drops an empty complete URI", () => {
		const body = deviceBody({ interval: undefined, verification_uri_complete: "" })
		const parsed = parseDeviceCodeResponse(body)
		expect(parsed.intervalSeconds).toBe(5)
		expect(parsed.verificationUriComplete).toBeNull()
	})

	test("refuses a body that misses a field", () => {
		expect(() => parseDeviceCodeResponse(null)).toThrow("not a JSON object")
		expect(() => parseDeviceCodeResponse(deviceBody({ device_code: "" }))).toThrow("device_code")
		expect(() => parseDeviceCodeResponse(deviceBody({ user_code: undefined }))).toThrow("user_code")
		expect(() => parseDeviceCodeResponse(deviceBody({ expires_in: "900" }))).toThrow("expires_in")
	})
})

describe("pollDecision", () => {
	test("returns the tokens of a successful poll", () => {
		const decision = pollDecision(200, tokenBody(), 5)
		expect(decision).toEqual({
			kind: "tokens",
			tokens: {
				accessToken: ACCESS_TOKEN,
				refreshToken: REFRESH_TOKEN,
				expiresIn: 900,
				scope: "openid offline_access data:ingest",
			},
		})
	})

	test("keeps the interval while authorization is pending", () => {
		expect(pollDecision(400, { error: "authorization_pending" }, 5)).toEqual({
			kind: "wait",
			intervalSeconds: 5,
		})
	})

	test("adds five seconds on slow_down", () => {
		expect(pollDecision(400, { error: "slow_down" }, 5)).toEqual({
			kind: "wait",
			intervalSeconds: 10,
		})
	})

	test("reports a declined sign-in", () => {
		expect(pollDecision(400, { error: "access_denied" }, 5)).toEqual({
			kind: "fail",
			message: "the sign-in was declined",
		})
	})

	test("reports an expired code", () => {
		expect(pollDecision(400, { error: "expired_token" }, 5)).toEqual({
			kind: "fail",
			message: "the code expired; run login again",
		})
	})

	test("names the status and code of any other error", () => {
		expect(pollDecision(503, { error: "temporarily_unavailable" }, 5)).toEqual({
			kind: "fail",
			message: "sign-in failed: HTTP 503 temporarily_unavailable",
		})
		expect(pollDecision(502, null, 5)).toEqual({
			kind: "fail",
			message: "sign-in failed: HTTP 502",
		})
	})

	test("never echoes a body that carries tokens", () => {
		const decision = pollDecision(500, { error: "server_error", ...tokenBody() }, 5)
		expect(decision.kind).toBe("fail")
		expect(JSON.stringify(decision)).not.toContain(ACCESS_TOKEN)
		expect(JSON.stringify(decision)).not.toContain(REFRESH_TOKEN)
	})

	test("fails a success status with a bad body", () => {
		const decision = pollDecision(200, { refresh_token: REFRESH_TOKEN }, 5)
		expect(decision.kind).toBe("fail")
		expect(JSON.stringify(decision)).not.toContain(REFRESH_TOKEN)
	})
})
