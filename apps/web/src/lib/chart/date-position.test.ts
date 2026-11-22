import { describe, expect, test } from "bun:test"
import { type DaySpan, dayPosition } from "./date-position"

// Two annual rows, as a projection draws them: row k's point sits at index k, its close.
const SPANS: DaySpan[] = [
	{ index: 0, from: "2026-10-31", to: "2027-10-30" },
	{ index: 1, from: "2027-10-31", to: "2028-10-30" },
	{ index: 2, from: "2028-10-31", to: "2028-12-31" },
]

describe("dayPosition", () => {
	test("places the last day of a span exactly on its close, and the first day of the next just after the one before", () => {
		expect(dayPosition(SPANS, "2028-12-31")).toBe(2)
		expect(dayPosition(SPANS, "2027-10-30")).toBe(0)
		// 2027-10-31 opens row 1, which runs 366 days through 2028-10-30 (it holds 29 February 2028).
		expect(dayPosition(SPANS, "2027-10-31")).toBeCloseTo(1 - 1 + 1 / 366, 12)
	})

	test("places a day by the share of its span's days that have passed", () => {
		// From 2026-10-31 to 2027-10-30 is 365 days. 2027-04-30 is the 181st day after the first.
		expect(dayPosition(SPANS, "2027-04-30")).toBeCloseTo(-1 + 182 / 365, 12)
	})

	test("counts a leap year's February, so the share uses the span's real length", () => {
		const leap: DaySpan[] = [{ index: 0, from: "2028-01-01", to: "2028-12-31" }]
		// 2028-03-01 is the 61st day of a 366-day year.
		expect(dayPosition(leap, "2028-03-01")).toBeCloseTo(-1 + 61 / 366, 12)
	})

	test("is null for a day no span holds", () => {
		expect(dayPosition(SPANS, "2025-01-01")).toBeNull()
		expect(dayPosition(SPANS, "2029-01-01")).toBeNull()
		expect(dayPosition([], "2027-01-01")).toBeNull()
	})

	test("refuses a value that is not a YYYY-MM-DD date", () => {
		expect(() => dayPosition(SPANS, "2027-4-30")).toThrow(RangeError)
	})
})
