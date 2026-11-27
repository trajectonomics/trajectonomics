import { describe, expect, it } from "bun:test"
import {
	authorizeMethodRejection,
	deviceApproveBodyRejection,
	deviceScopeRejection,
	formMediaTypeRejection,
} from "./oauth-request"

describe("formMediaTypeRejection", () => {
	it("allows the exact form media type, with or without parameters", () => {
		expect(formMediaTypeRejection("application/x-www-form-urlencoded")).toBeNull()
		expect(formMediaTypeRejection("application/x-www-form-urlencoded; charset=UTF-8")).toBeNull()
		expect(formMediaTypeRejection("APPLICATION/X-WWW-FORM-URLENCODED")).toBeNull()
	})

	it("rejects a Content-Type that only contains the form media type", () => {
		expect(formMediaTypeRejection("application/json; x=application/x-www-form-urlencoded")).toBe(
			"smuggled-form-media-type",
		)
		expect(formMediaTypeRejection("text/plain; boundary=application/x-www-form-urlencoded")).toBe(
			"smuggled-form-media-type",
		)
		expect(formMediaTypeRejection("application/x-www-form-urlencoded-x")).toBe(
			"smuggled-form-media-type",
		)
	})

	it("ignores a media type that does not mention form encoding", () => {
		expect(formMediaTypeRejection("application/json")).toBeNull()
		expect(formMediaTypeRejection("")).toBeNull()
		expect(formMediaTypeRejection(null)).toBeNull()
		expect(formMediaTypeRejection(undefined)).toBeNull()
	})
})

describe("deviceScopeRejection", () => {
	it("accepts a non-empty scope", () => {
		expect(deviceScopeRejection("openid offline_access")).toBeNull()
	})

	it("rejects a missing, empty or whitespace scope", () => {
		expect(deviceScopeRejection(undefined)).toBe("scope-required")
		expect(deviceScopeRejection(null)).toBe("scope-required")
		expect(deviceScopeRejection("")).toBe("scope-required")
		expect(deviceScopeRejection("   ")).toBe("scope-required")
		expect(deviceScopeRejection(["openid"])).toBe("scope-required")
	})
})

describe("authorizeMethodRejection", () => {
	it("rejects a client POST to the authorize endpoint", () => {
		expect(authorizeMethodRejection({ method: "POST", isEndpointRequest: true })).toBe(
			"post-authorize",
		)
	})

	it("allows GET", () => {
		expect(authorizeMethodRejection({ method: "GET", isEndpointRequest: true })).toBeNull()
	})

	it("allows the internal re-dispatch after sign-in, where the real request is not authorize", () => {
		expect(authorizeMethodRejection({ method: "POST", isEndpointRequest: false })).toBeNull()
	})
})

describe("deviceApproveBodyRejection", () => {
	it("accepts a body with only userCode", () => {
		expect(deviceApproveBodyRejection({ userCode: "ABCD-EFGH" })).toBeNull()
	})

	it("refuses a body that also carries a signed query", () => {
		expect(
			deviceApproveBodyRejection({ userCode: "ABCD-EFGH", oauth_query: "client_id=x&sig=bogus" }),
		).toBe("unexpected-field")
	})

	it("leaves a missing body to the endpoint", () => {
		expect(deviceApproveBodyRejection(undefined)).toBeNull()
	})
})
