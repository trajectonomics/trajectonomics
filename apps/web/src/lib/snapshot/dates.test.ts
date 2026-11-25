import { describe, expect, test } from "bun:test"
import {
	addMonths,
	daysInMonth,
	firstDayOfYear,
	firstDayTwoMonthsBack,
	HISTORY_MONTHS,
	isValidDate,
	monthEnd,
	monthEndsBetween,
} from "./dates"

describe("month-end dates", () => {
	test("a month-end on the As-of is the last point of the history", () => {
		const ends = monthEndsBetween("2026-01-01", "2026-10-31")
		expect(ends).toHaveLength(10)
		expect(ends.at(-1)).toBe("2026-10-31")
		expect(ends[0]).toBe("2026-01-31")
	})

	test("a month-end after the As-of is left out", () => {
		expect(monthEndsBetween("2026-01-01", "2026-10-15").at(-1)).toBe("2026-09-30")
	})

	test("a first transaction after a month-end starts the history at the next month-end", () => {
		expect(monthEndsBetween("2026-01-15", "2026-03-31")).toEqual([
			"2026-01-31",
			"2026-02-28",
			"2026-03-31",
		])
	})

	test("February of a leap year ends on the 29th, and of a common year on the 28th", () => {
		expect(monthEndsBetween("2024-02-01", "2024-03-31")).toEqual(["2024-02-29", "2024-03-31"])
		expect(monthEndsBetween("2023-02-01", "2023-03-31")).toEqual(["2023-02-28", "2023-03-31"])
	})

	test("a century year is a leap year only when divisible by 400", () => {
		expect(daysInMonth(2100, 2)).toBe(28)
		expect(daysInMonth(2000, 2)).toBe(29)
		expect(monthEnd(2100, 2)).toBe("2100-02-28")
	})

	test("the history holds at most the last 120 month-ends, ten years", () => {
		const ends = monthEndsBetween("2010-01-01", "2026-10-31")
		expect(ends).toHaveLength(HISTORY_MONTHS)
		expect(HISTORY_MONTHS).toBe(120)
		expect(ends.at(-1)).toBe("2026-10-31")
		expect(ends[0]).toBe("2016-11-30")
	})

	test("a ledger that starts five years back is held whole", () => {
		const ends = monthEndsBetween("2021-11-01", "2026-10-31")
		expect(ends).toHaveLength(60)
		expect(ends[0]).toBe("2021-11-30")
	})

	test("a history that ends before it starts is empty", () => {
		expect(monthEndsBetween("2026-05-01", "2026-01-01")).toEqual([])
	})

	test("a December month-end falls in the year it names", () => {
		expect(monthEndsBetween("2026-12-01", "2026-12-31")).toEqual(["2026-12-31"])
		expect(monthEnd(2026, 12)).toBe("2026-12-31")
	})
})

describe("the first day of the As-of year", () => {
	test("is January the first of the year that holds the As-of", () => {
		expect(firstDayOfYear("2026-10-31")).toBe("2026-01-01")
	})

	test("on the first day of a year it is that same day", () => {
		expect(firstDayOfYear("2027-01-01")).toBe("2027-01-01")
	})
})

describe("the first day of the month two months back", () => {
	test("from mid-year it is the first of the month two months earlier", () => {
		expect(firstDayTwoMonthsBack("2026-10-31")).toBe("2026-08-01")
	})

	test("crosses the year boundary going back from January and February", () => {
		expect(firstDayTwoMonthsBack("2027-01-15")).toBe("2026-11-01")
		expect(firstDayTwoMonthsBack("2026-02-28")).toBe("2025-12-01")
	})

	test("from March it is January of the same year, whatever the day", () => {
		expect(firstDayTwoMonthsBack("2026-03-31")).toBe("2026-01-01")
	})
})

describe("calendar validity and month arithmetic", () => {
	test("a day that does not exist is not a date, and 29 February needs a leap year", () => {
		expect(isValidDate("2026-02-29")).toBe(false)
		expect(isValidDate("2028-02-29")).toBe(true)
		expect(isValidDate("2026-13-01")).toBe(false)
		expect(isValidDate("26-10-31")).toBe(false)
	})

	test("adding months moves the year at the boundary, in both directions", () => {
		expect(addMonths(2026, 12, 1)).toEqual([2027, 1])
		expect(addMonths(2026, 1, -1)).toEqual([2025, 12])
		expect(addMonths(2026, 10, 0)).toEqual([2026, 10])
	})
})
