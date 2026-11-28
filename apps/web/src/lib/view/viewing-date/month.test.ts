import { describe, expect, test } from "bun:test"
import { addMonthsTo, firstDayOf, lastDayOf, monthOf, monthsBetween, parseMonth } from "./month"

describe("a month is exactly YYYY-MM", () => {
	test("reads a month, and rejects an empty string, a month outside 01 to 12, a word and a full date", () => {
		expect(parseMonth("2026-10")).toBe("2026-10")
		expect(parseMonth("")).toBeNull()
		expect(parseMonth("2026-13")).toBeNull()
		expect(parseMonth("2026-00")).toBeNull()
		expect(parseMonth("life")).toBeNull()
		expect(parseMonth("2026-10-31")).toBeNull()
	})

	test("takes the month of a date, mid-month too", () => {
		expect(monthOf("2026-10-31")).toBe("2026-10")
		expect(monthOf("2026-11-28")).toBe("2026-11")
		expect(monthOf("2026-10")).toBe("2026-10")
	})
})

describe("moving through months", () => {
	test("adds whole months, across a year either way", () => {
		expect(addMonthsTo("2026-10", 0)).toBe("2026-10")
		expect(addMonthsTo("2026-10", 3)).toBe("2027-01")
		expect(addMonthsTo("2026-10", -10)).toBe("2025-12")
		expect(addMonthsTo("2024-11", 24)).toBe("2026-11")
	})

	test("counts the whole months between two months, negative when the second is earlier", () => {
		expect(monthsBetween("2026-10", "2026-10")).toBe(0)
		expect(monthsBetween("2026-10", "2026-09")).toBe(-1)
		expect(monthsBetween("2025-03", "2026-10")).toBe(19)
		expect(monthsBetween("2024-11", "2053-12")).toBe(349)
	})
})

describe("the ends of a month", () => {
	test("the first day is the first", () => {
		expect(firstDayOf("2026-10")).toBe("2026-10-01")
	})

	test("the last day is the calendar's, a leap February included", () => {
		expect(lastDayOf("2028-02")).toBe("2028-02-29")
		expect(lastDayOf("2026-02")).toBe("2026-02-28")
		expect(lastDayOf("2026-12")).toBe("2026-12-31")
	})
})
