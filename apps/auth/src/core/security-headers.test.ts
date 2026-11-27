import { describe, expect, it } from "bun:test"
import {
	SECURITY_HEADERS,
	WORKER_CONTENT_SECURITY_POLICY,
	withSecurityHeaders,
} from "./security-headers"

describe("the headers on a Worker answer", () => {
	it("sets the strict policy when the handler set none", () => {
		const response = withSecurityHeaders(
			new Response("{}", { headers: { "content-type": "application/json" } }),
		)
		expect(response.headers.get("content-security-policy")).toBe(WORKER_CONTENT_SECURITY_POLICY)
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			expect(response.headers.get(name)).toBe(value)
		}
	})

	it("keeps a policy the handler set, such as the end-session form's", () => {
		const policy = "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
		const response = withSecurityHeaders(
			new Response("<html>confirm</html>", {
				headers: { "content-type": "text/html", "content-security-policy": policy },
			}),
		)
		expect(response.headers.get("content-security-policy")).toBe(policy)
	})

	it("adds only the missing frame rule to a handler policy", () => {
		const policy = "default-src 'none'; form-action 'self'; base-uri 'none'"
		const response = withSecurityHeaders(
			new Response("<html>error</html>", {
				headers: { "content-type": "text/html", "content-security-policy": policy },
			}),
		)
		expect(response.headers.get("content-security-policy")).toBe(
			`${policy}; frame-ancestors 'none'`,
		)
	})

	it("does not overwrite a security header the handler already set", () => {
		const response = withSecurityHeaders(
			new Response(null, { headers: { "x-frame-options": "SAMEORIGIN" } }),
		)
		expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN")
		expect(response.headers.get("x-content-type-options")).toBe("nosniff")
	})
})
