import { describe, expect, it } from "bun:test"
import { grantTypeDecision } from "./grant-type"

describe("grantTypeDecision", () => {
	it("accepts the two grant types the token endpoint serves", () => {
		expect(grantTypeDecision("refresh_token")).toEqual({
			grantType: "refresh_token",
			rejection: null,
		})
		expect(grantTypeDecision("urn:ietf:params:oauth:grant-type:device_code")).toEqual({
			grantType: "urn:ietf:params:oauth:grant-type:device_code",
			rejection: null,
		})
		expect(grantTypeDecision("authorization_code")).toEqual({
			grantType: "authorization_code",
			rejection: null,
		})
	})

	it("rejects a value the library would trim, instead of comparing it", () => {
		expect(grantTypeDecision("refresh_token ")).toEqual({
			grantType: null,
			rejection: "grant-type-padded",
		})
		expect(grantTypeDecision(" refresh_token")).toEqual({
			grantType: null,
			rejection: "grant-type-padded",
		})
		expect(grantTypeDecision("\trefresh_token")).toEqual({
			grantType: null,
			rejection: "grant-type-padded",
		})
		expect(grantTypeDecision("\nrefresh_token\r")).toEqual({
			grantType: null,
			rejection: "grant-type-padded",
		})
		expect(grantTypeDecision("urn:ietf:params:oauth:grant-type:device_code ")).toEqual({
			grantType: null,
			rejection: "grant-type-padded",
		})
	})

	it("rejects a missing, empty or non-string value", () => {
		expect(grantTypeDecision(undefined)).toEqual({
			grantType: null,
			rejection: "grant-type-invalid",
		})
		expect(grantTypeDecision("")).toEqual({ grantType: null, rejection: "grant-type-invalid" })
		expect(grantTypeDecision("   ")).toEqual({ grantType: null, rejection: "grant-type-invalid" })
		expect(grantTypeDecision(["refresh_token"])).toEqual({
			grantType: null,
			rejection: "grant-type-invalid",
		})
		expect(grantTypeDecision(1)).toEqual({ grantType: null, rejection: "grant-type-invalid" })
	})
})
