import { describe, expect, it } from "bun:test"
import { normalizeUserCode, userCodeCandidates } from "./device-code"

describe("normalizeUserCode", () => {
	it("strips separators and upper-cases", () => {
		expect(normalizeUserCode("abcd-efgh")).toBe("ABCDEFGH")
		expect(normalizeUserCode("ABCD EFGH")).toBe("ABCDEFGH")
		expect(normalizeUserCode("ab_cd.efgh")).toBe("ABCDEFGH")
		expect(normalizeUserCode("ABCDEFGH")).toBe("ABCDEFGH")
	})
})

describe("userCodeCandidates", () => {
	it("tries the exact code first, then the library's normalized form", () => {
		expect(userCodeCandidates("ABCDEFGH")).toEqual(["ABCDEFGH"])
		expect(userCodeCandidates("abcd-efgh")).toEqual(["abcd-efgh", "ABCDEFGH"])
		expect(userCodeCandidates("abcd efgh")).toEqual(["abcd efgh", "ABCDEFGH"])
	})

	it("does not invent a normalized lookup for a custom code outside the default alphabet", () => {
		expect(userCodeCandidates("custom-code")).toEqual(["custom-code"])
		expect(userCodeCandidates("abc0defg")).toEqual(["abc0defg"])
	})
})
