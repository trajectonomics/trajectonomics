import { describe, expect, test } from "bun:test"
import {
	authIssuer,
	DEFAULT_AUTH_ISSUER,
	requireSecureIssuer,
	trimIssuer,
} from "../src/auth/config"

describe("authIssuer", () => {
	test("defaults to the auth Worker", () => {
		expect(authIssuer({})).toBe(DEFAULT_AUTH_ISSUER)
	})

	test("uses TRAJ_AUTH_URL and drops trailing slashes", () => {
		expect(authIssuer({ TRAJ_AUTH_URL: "https://auth.synthetic.test/" })).toBe(
			"https://auth.synthetic.test",
		)
	})

	test("ignores an empty override", () => {
		expect(authIssuer({ TRAJ_AUTH_URL: "" })).toBe(DEFAULT_AUTH_ISSUER)
	})

	test("refuses plain HTTP outside loopback", () => {
		expect(() => authIssuer({ TRAJ_AUTH_URL: "http://auth.synthetic.test" })).toThrow(
			"issuer must use https",
		)
	})
})

describe("requireSecureIssuer", () => {
	test("accepts https and loopback http", () => {
		for (const issuer of [
			"https://auth.synthetic.test",
			"http://localhost:8787",
			"http://127.0.0.1:8787",
			"http://[::1]:8787",
		]) {
			expect(requireSecureIssuer(issuer)).toBe(issuer)
		}
	})

	test("refuses http on any other host and a value that is not a URL", () => {
		expect(() => requireSecureIssuer("http://auth.synthetic.test")).toThrow("issuer must use https")
		expect(() => requireSecureIssuer("auth.synthetic.test")).toThrow("issuer is not a URL")
	})
})

describe("trimIssuer", () => {
	test("drops trailing slashes", () => {
		expect(trimIssuer("https://auth.synthetic.test///")).toBe("https://auth.synthetic.test")
	})
})
