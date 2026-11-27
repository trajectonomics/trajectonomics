import { describe, expect, it } from "bun:test"
import { devSignInAllowed, isLoopbackUrl } from "./dev"

describe("devSignInAllowed", () => {
	const local = {
		environment: "development",
		devOnly: "true",
		baseUrl: "http://localhost:8787",
	}

	it("allows the test user only in development on a loopback origin", () => {
		expect(devSignInAllowed(local)).toBe(true)
		expect(devSignInAllowed({ ...local, baseUrl: "http://127.0.0.1:8787" })).toBe(true)
	})

	it("refuses production even when DEV_ONLY is set", () => {
		expect(devSignInAllowed({ ...local, environment: "production" })).toBe(false)
		expect(devSignInAllowed({ ...local, environment: undefined })).toBe(false)
	})

	it("refuses a non-loopback origin, so a deployed host cannot enable it", () => {
		expect(devSignInAllowed({ ...local, baseUrl: "https://auth.trajectonomics.com" })).toBe(false)
		expect(devSignInAllowed({ ...local, baseUrl: "http://192.168.1.20:8787" })).toBe(false)
	})

	it("requires the flag and a parseable URL", () => {
		expect(devSignInAllowed({ ...local, devOnly: undefined })).toBe(false)
		expect(devSignInAllowed({ ...local, devOnly: "false" })).toBe(false)
		expect(devSignInAllowed({ ...local, baseUrl: "not a url" })).toBe(false)
	})
})

describe("isLoopbackUrl", () => {
	it("accepts localhost and its address literals", () => {
		expect(isLoopbackUrl("http://localhost")).toBe(true)
		expect(isLoopbackUrl("https://127.0.0.1:8787/path")).toBe(true)
		expect(isLoopbackUrl("http://[::1]:8787")).toBe(true)
	})

	it("rejects everything else", () => {
		expect(isLoopbackUrl("https://auth.trajectonomics.com")).toBe(false)
		expect(isLoopbackUrl("ftp://localhost")).toBe(false)
		expect(isLoopbackUrl("localhost:8787")).toBe(false)
	})
})
