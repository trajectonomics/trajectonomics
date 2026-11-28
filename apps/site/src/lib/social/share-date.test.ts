import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { dateFraction, shortMonthYear } from "./share-date"

/** The `code` a rejected call throws, so a test names the rule rather than only the throw. */
function codeOf(run: () => unknown): string | undefined {
	try {
		run()
	} catch (error) {
		return (error as { code?: string }).code
	}
	return undefined
}

describe("a share date the picture cannot use", () => {
	it("rejects text that is not an ISO yyyy-mm-dd date with SHARE_DATE_INVALID", () => {
		const months = dictionaryFor("en").shareMonths
		expect(codeOf(() => shortMonthYear("31 March 2026", months))).toBe("SHARE_DATE_INVALID")
		expect(codeOf(() => dateFraction("31 March 2026", "2026-03-31", "2066-03-31"))).toBe(
			"SHARE_DATE_INVALID",
		)
	})

	it("rejects a month no name covers with SHARE_DATE_MONTH_MISSING", () => {
		expect(codeOf(() => shortMonthYear("2041-13-01", dictionaryFor("en").shareMonths))).toBe(
			"SHARE_DATE_MONTH_MISSING",
		)
	})

	it("rejects a span that does not move forward with SHARE_DATE_SPAN_EMPTY", () => {
		expect(codeOf(() => dateFraction("2041-08-01", "2066-03-31", "2026-03-31"))).toBe(
			"SHARE_DATE_SPAN_EMPTY",
		)
		expect(codeOf(() => dateFraction("2041-08-01", "2026-03-31", "2026-03-31"))).toBe(
			"SHARE_DATE_SPAN_EMPTY",
		)
	})
})
