import { describe, expect, test } from "bun:test"
import { monthBefore } from "./month-shift"

describe("monthBefore", () => {
	test("moves a day back one calendar month", () => {
		expect(monthBefore("2026-10-28")).toBe("2026-09-28")
		expect(monthBefore("2026-10-01")).toBe("2026-09-01")
	})

	test("moves January back to December of the year before", () => {
		expect(monthBefore("2026-01-31")).toBe("2025-12-31")
		expect(monthBefore("2026-01-01")).toBe("2025-12-01")
	})

	test("falls on the earlier month's last day when it is shorter", () => {
		expect(monthBefore("2026-03-31")).toBe("2026-02-28")
		expect(monthBefore("2028-03-31")).toBe("2028-02-29")
	})

	test("refuses a date that is not a real YYYY-MM-DD day", () => {
		expect(() => monthBefore("2026-02-30")).toThrow(RangeError)
		expect(() => monthBefore("2026-2-1")).toThrow(RangeError)
	})
})
