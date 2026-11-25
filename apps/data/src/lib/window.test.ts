import { describe, expect, test } from "bun:test"
import { isDay, lastDays, utcDay } from "./window"

describe("a UTC day", () => {
	test("is the calendar day of the clock reading", () => {
		expect(utcDay(Date.parse("2026-11-25T23:59:59.000Z"))).toBe("2026-11-25")
		expect(utcDay(Date.parse("2026-11-26T00:00:00.000Z"))).toBe("2026-11-26")
	})

	test("must be a real date in YYYY-MM-DD form", () => {
		expect(isDay("2026-11-25")).toBe(true)
		expect(isDay("2026-02-30")).toBe(false)
		expect(isDay("2026-2-3")).toBe(false)
		expect(isDay("")).toBe(false)
	})
})

describe("the overview window", () => {
	test("is 30 inclusive days ending on the chosen day", () => {
		const window = lastDays("2026-03-02")
		expect(window.days).toHaveLength(30)
		expect(window.from).toBe("2026-02-01")
		expect(window.to).toBe("2026-03-02")
		expect(window.days[0]).toBe("2026-02-01")
		expect(window.days[29]).toBe("2026-03-02")
	})

	test("crosses February in a leap year", () => {
		const window = lastDays("2028-03-01")
		expect(window.days).toHaveLength(30)
		expect(window.from).toBe("2028-02-01")
		expect(window.days[28]).toBe("2028-02-29")
	})

	test("rejects a day that is not a UTC day", () => {
		expect(() => lastDays("2026-02-30")).toThrow()
	})

	test("rejects a count below one", () => {
		expect(() => lastDays("2026-11-25", 0)).toThrow()
	})
})
