import { describe, expect, test } from "bun:test"
import {
	base64url,
	clearCookie,
	equalConstantTime,
	parseCookies,
	parseOauthCookie,
	setCookie,
} from "./web-auth"

const STATE = "s".repeat(43)
const VERIFIER = "v".repeat(43)

describe("base64url", () => {
	test("is unpadded and URL safe", () => {
		expect(base64url(new Uint8Array([0xfb, 0xff]))).toBe("-_8")
	})

	test("is 43 characters for 32 bytes", () => {
		expect(base64url(new Uint8Array(32))).toHaveLength(43)
	})
})

describe("parseCookies", () => {
	test("tolerates spaces and skips malformed pairs", () => {
		const cookies = parseCookies(" a=b ; c ; d = e ; bad ; =x")
		expect(cookies.get("a")).toBe("b")
		expect(cookies.get("d")).toBe("e")
		expect(cookies.has("c")).toBe(false)
		expect(cookies.size).toBe(2)
	})

	test("keeps the first value on a duplicate", () => {
		expect(parseCookies("a=1; a=2").get("a")).toBe("1")
	})

	test("has none without a header", () => {
		expect(parseCookies(null).size).toBe(0)
	})
})

describe("the cookie values", () => {
	test("setCookie writes the exact flags", () => {
		expect(setCookie("n", "v", { path: "/data/auth", maxAge: 600 })).toBe(
			"n=v; Path=/data/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax",
		)
	})

	test("clearCookie is empty and expires at once", () => {
		expect(clearCookie("n", "/data")).toBe(
			"n=; Path=/data; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
		)
	})
})

describe("parseOauthCookie", () => {
	test("accepts two 43-character base64url parts", () => {
		expect(parseOauthCookie(`${STATE}.${VERIFIER}`)).toEqual({
			state: STATE,
			verifier: VERIFIER,
		})
	})

	test.each([
		["no dot", `${STATE}${VERIFIER}`],
		["two dots", `${STATE}.${VERIFIER}.${STATE}`],
		["short state", `${STATE.slice(1)}.${VERIFIER}`],
		["long verifier", `${STATE}.${VERIFIER}v`],
		["invalid state character", `${"-".repeat(42)}!.${VERIFIER}`],
		["empty", ""],
	])("rejects %s", (_name, value) => {
		expect(parseOauthCookie(value)).toBeNull()
	})

	test("rejects a missing cookie", () => {
		expect(parseOauthCookie(null)).toBeNull()
	})
})

describe("equalConstantTime", () => {
	test("accepts equal strings", () => {
		expect(equalConstantTime(STATE, STATE)).toBe(true)
	})

	test("refuses a difference of the same length", () => {
		expect(equalConstantTime(STATE, `${"s".repeat(42)}t`)).toBe(false)
	})

	test("refuses a different length", () => {
		expect(equalConstantTime(STATE, STATE.slice(1))).toBe(false)
	})

	test("accepts two empty strings", () => {
		expect(equalConstantTime("", "")).toBe(true)
	})
})
