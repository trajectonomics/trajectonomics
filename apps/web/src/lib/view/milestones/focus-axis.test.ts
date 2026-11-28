import { describe, expect, test } from "bun:test"
import { dateShare, monthIndex } from "./focus-axis"

describe("monthIndex", () => {
	test("counts whole months from January of year 0, whatever the day", () => {
		expect(monthIndex("2026-01-01")).toBe(24312)
		expect(monthIndex("2026-01-31")).toBe(24312)
		expect(monthIndex("2026-12-31")).toBe(24323)
		expect(monthIndex("2027-01-01")).toBe(24324)
	})

	test("refuses a date that is not shaped YYYY-MM-DD", () => {
		expect(() => monthIndex("2026-1-1")).toThrow(RangeError)
		expect(() => monthIndex("Jan 2026")).toThrow(RangeError)
	})
})

describe("dateShare", () => {
	test("places a day by its month between the timeline's ends, clamped to the line", () => {
		expect(dateShare("2026-10-31", "2036-10-31", "2026-10-31")).toBe(0)
		expect(dateShare("2026-10-31", "2036-10-31", "2031-10-01")).toBe(0.5)
		expect(dateShare("2026-10-31", "2036-10-31", "2036-10-31")).toBe(1)
		expect(dateShare("2026-10-31", "2036-10-31", "2040-01-01")).toBe(1)
		expect(dateShare("2026-10-31", "2036-10-31", "2020-01-01")).toBe(0)
	})

	test("places every day at the start of a timeline one month long", () => {
		expect(dateShare("2026-10-31", "2026-10-31", "2026-10-31")).toBe(0)
	})
})
