import { describe, expect, it } from "bun:test"
import { daysInMonth, isLeapYear } from "./calendar"

describe("the calendar rule", () => {
	it("counts February's days by the Gregorian rule", () => {
		expect([1900, 2000, 2024, 2100].map(isLeapYear)).toEqual([false, true, true, false])
		expect(daysInMonth(2026, 2)).toBe(28)
		expect(daysInMonth(2028, 2)).toBe(29)
		expect(daysInMonth(1900, 2)).toBe(28)
		expect(daysInMonth(2000, 2)).toBe(29)
	})

	it("counts every other month's days", () => {
		expect([...Array(12).keys()].map((index) => daysInMonth(2026, index + 1))).toEqual([
			31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
		])
		expect(daysInMonth(2026, 0)).toBe(0)
		expect(daysInMonth(2026, 13)).toBe(0)
	})
})
