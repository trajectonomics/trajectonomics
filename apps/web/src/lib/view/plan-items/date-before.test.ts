import { describe, expect, test } from "bun:test"
import { dayBefore } from "./date-before"

describe("dayBefore", () => {
	test("steps back inside a month, across a month, across a year and over a leap day", () => {
		expect(dayBefore("2030-07-15")).toBe("2030-07-14")
		expect(dayBefore("2030-07-01")).toBe("2030-06-30")
		expect(dayBefore("2030-01-01")).toBe("2029-12-31")
		expect(dayBefore("2028-03-01")).toBe("2028-02-29")
		expect(dayBefore("2029-03-01")).toBe("2029-02-28")
		expect(dayBefore("2100-03-01")).toBe("2100-02-28")
	})

	test("is null for text that is not a real day", () => {
		expect(dayBefore("2030-02-30")).toBeNull()
		expect(dayBefore("soon")).toBeNull()
	})
})
