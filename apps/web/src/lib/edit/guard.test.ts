import { describe, expect, test } from "bun:test"
import { refuseEdit, refuseSession } from "./guard"

const GOOD = {
	method: "POST",
	host: "127.0.0.1:4321",
	origin: "http://127.0.0.1:4321",
	token: "t-secret",
	contentType: "application/json",
	port: 4321,
	expectedToken: "t-secret",
	ready: true,
	busy: false,
}

describe("refuseEdit", () => {
	test("accepts a request that holds every rule, and a charset on the media type", () => {
		expect(refuseEdit(GOOD)).toBeNull()
		expect(refuseEdit({ ...GOOD, contentType: "application/json; charset=utf-8" })).toBeNull()
	})

	test("refuses a bad Host with 403", () => {
		expect(refuseEdit({ ...GOOD, host: "evil.example:4321" })?.status).toBe(403)
		expect(refuseEdit({ ...GOOD, host: null })?.code).toBe("bad_host")
	})

	test("refuses an Origin other than this server's own, and a missing one", () => {
		expect(refuseEdit({ ...GOOD, origin: "http://evil.example" })?.code).toBe("bad_origin")
		expect(refuseEdit({ ...GOOD, origin: "http://localhost:4321" })?.code).toBe("bad_origin")
		expect(refuseEdit({ ...GOOD, origin: "http://127.0.0.1:9999" })?.code).toBe("bad_origin")
		expect(refuseEdit({ ...GOOD, origin: null })?.code).toBe("bad_origin")
	})

	test("refuses a missing or wrong session token", () => {
		expect(refuseEdit({ ...GOOD, token: null })?.code).toBe("bad_token")
		expect(refuseEdit({ ...GOOD, token: "guess" })?.status).toBe(403)
	})

	test("refuses any Content-Type but application/json", () => {
		expect(refuseEdit({ ...GOOD, contentType: "text/plain" })?.status).toBe(415)
		expect(refuseEdit({ ...GOOD, contentType: "application/x-www-form-urlencoded" })?.status).toBe(
			415,
		)
		expect(refuseEdit({ ...GOOD, contentType: null })?.code).toBe("unsupported_media_type")
	})

	test("refuses a second Edit while one runs, with 409", () => {
		expect(refuseEdit({ ...GOOD, busy: true })?.code).toBe("edit_running")
	})

	test("refuses an Edit before the first Snapshot is in, and any method but POST", () => {
		expect(refuseEdit({ ...GOOD, ready: false })?.code).toBe("not_ready")
		expect(refuseEdit({ ...GOOD, method: "GET" })?.status).toBe(405)
	})

	test("checks the Host before the Origin, so a foreign Host is never told about the Origin", () => {
		expect(refuseEdit({ ...GOOD, host: "evil.example:4321", origin: null })?.code).toBe("bad_host")
	})
})

describe("refuseSession", () => {
	test("answers only GET from this machine", () => {
		expect(refuseSession({ method: "GET", host: "127.0.0.1:4321", port: 4321 })).toBeNull()
		expect(refuseSession({ method: "GET", host: "evil.example:4321", port: 4321 })?.status).toBe(
			403,
		)
		expect(refuseSession({ method: "POST", host: "127.0.0.1:4321", port: 4321 })?.status).toBe(405)
	})
})
