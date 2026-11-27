import { describe, expect, it } from "bun:test"
import {
	isExpiredSignedOAuthSearch,
	isSignedOAuthSearch,
	signedOAuthExpiresAtMs,
} from "./oauth-search"

/** A signed query as the provider hands it to a page, with `exp` in seconds. */
function signedSearch(expiresAtSeconds: number, extra = ""): string {
	const params = new URLSearchParams({
		client_id: "traj-data-web",
		redirect_uri: "https://trajectonomics.com/data/auth/callback",
		sig: "signature",
		exp: String(expiresAtSeconds),
		ba_iat: "1764259200000",
		ba_param: "client_id",
	})
	return `${extra === "" ? "" : `${extra}&`}${params.toString()}`
}

describe("a signed OAuth query", () => {
	const now = Date.parse("2026-11-27T10:00:00.000Z")

	it("is one only when it is signed and names a client", () => {
		expect(isSignedOAuthSearch(signedSearch(now / 1_000 + 600))).toBe(true)
		expect(isSignedOAuthSearch("?client_id=traj-data-web")).toBe(false)
		expect(isSignedOAuthSearch("?next=%2Faccount%2F")).toBe(false)
	})

	it("reads its expiry from the signed seconds", () => {
		expect(signedOAuthExpiresAtMs(signedSearch(1_764_259_200))).toBe(1_764_259_200_000)
		expect(signedOAuthExpiresAtMs("?next=%2F")).toBeNull()
		expect(signedOAuthExpiresAtMs("?exp=soon&sig=x&client_id=y")).toBeNull()
	})

	it("is still alive inside its ten minutes", () => {
		expect(isExpiredSignedOAuthSearch(signedSearch(now / 1_000 + 60), now)).toBe(false)
	})

	it("is expired once the signed minute has passed", () => {
		expect(isExpiredSignedOAuthSearch(signedSearch(now / 1_000 - 1), now)).toBe(true)
	})

	it("counts a signed query with no expiry as expired, as the provider does", () => {
		const search = "?client_id=traj-data-web&sig=signature"
		expect(isExpiredSignedOAuthSearch(search, now)).toBe(true)
	})

	it("leaves a page without a signed flow alone", () => {
		expect(isExpiredSignedOAuthSearch("?next=%2Faccount%2F", now)).toBe(false)
		expect(isExpiredSignedOAuthSearch("", now)).toBe(false)
	})
})
