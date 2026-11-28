import { describe, expect, test } from "bun:test"
import { accountIdOf, parseTokenResponse } from "../src/auth/tokens"
import { ACCESS_TOKEN, ACCOUNT_ID, fakeJwt, REFRESH_TOKEN, tokenBody } from "./support/auth"

describe("parseTokenResponse", () => {
	test("reads a complete token response", () => {
		expect(parseTokenResponse(tokenBody())).toEqual({
			accessToken: ACCESS_TOKEN,
			refreshToken: REFRESH_TOKEN,
			expiresIn: 900,
			scope: "openid offline_access data:ingest",
		})
	})

	test("refuses a response without both tokens or a numeric expiry", () => {
		expect(() => parseTokenResponse(null)).toThrow("not a JSON object")
		expect(() => parseTokenResponse(tokenBody({ access_token: "" }))).toThrow("access_token")
		expect(() => parseTokenResponse(tokenBody({ refresh_token: undefined }))).toThrow(
			"refresh_token",
		)
		expect(() => parseTokenResponse(tokenBody({ expires_in: "900" }))).toThrow("expires_in")
	})

	test("never puts a token value in the error", () => {
		const parse = () => parseTokenResponse(tokenBody({ refresh_token: "" }))
		expect(parse).toThrow("refresh_token")
		expect(parse).not.toThrow(ACCESS_TOKEN)
		expect(parse).not.toThrow(REFRESH_TOKEN)
	})
})

describe("accountIdOf", () => {
	test("reads the sub claim without verifying the signature", () => {
		expect(accountIdOf(fakeJwt({ sub: ACCOUNT_ID }))).toBe(ACCOUNT_ID)
	})

	test("returns null for a payload without a usable sub", () => {
		expect(accountIdOf(fakeJwt({}))).toBeNull()
		expect(accountIdOf(fakeJwt({ sub: "" }))).toBeNull()
		expect(accountIdOf(fakeJwt({ sub: 42 }))).toBeNull()
	})

	test("returns null for a value that is not a JWT", () => {
		expect(accountIdOf("not-a-jwt")).toBeNull()
		expect(accountIdOf("a.b.c")).toBeNull()
		expect(accountIdOf("")).toBeNull()
	})
})
