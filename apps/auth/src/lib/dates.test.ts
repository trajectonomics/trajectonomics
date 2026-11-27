import { describe, expect, it } from "bun:test"
import { formatDate } from "./dates"

describe("a stored date", () => {
	it("is written in the page's locale", () => {
		expect(formatDate("2026-11-27T10:00:00.000Z", "en-GB")).toBe("27 Nov 2026")
		expect(formatDate("2026-11-27T10:00:00.000Z", "th-TH").length).toBeGreaterThan(0)
	})

	it("is the same day at every hour of the UTC day", () => {
		expect(formatDate("2026-11-27T00:00:00.000Z", "en-GB")).toBe("27 Nov 2026")
		expect(formatDate("2026-11-27T23:59:59.000Z", "en-GB")).toBe("27 Nov 2026")
	})

	it("shows nothing when there is no date or it cannot be read", () => {
		expect(formatDate(null, "en-GB")).toBe("")
		expect(formatDate("", "en-GB")).toBe("")
		expect(formatDate("not a date", "en-GB")).toBe("")
	})
})
