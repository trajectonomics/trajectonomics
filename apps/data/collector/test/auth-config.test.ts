import { describe, expect, test } from "bun:test"
import { authIssuer, DEFAULT_AUTH_ISSUER } from "../src/auth/config"

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
})
