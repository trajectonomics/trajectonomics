import { describe, expect, test } from "bun:test"
import { isDateText, slugId, typedAmount, uniqueId, withoutKeys } from "./form"

describe("typedAmount", () => {
	test("removes thousands commas and outer spaces, and keeps the digits as the person typed them", () => {
		expect(typedAmount("9,000.50")).toBe("9000.50")
		expect(typedAmount("1,234,567")).toBe("1234567")
		expect(typedAmount("-1,000.5")).toBe("-1000.5")
		expect(typedAmount(" 350 ")).toBe("350")
		expect(typedAmount("-5")).toBe("-5")
	})

	test("refuses a comma that is not a thousands separator, so 9000,50 never becomes 900050", () => {
		expect(typedAmount("9000,50")).toBeNull()
		expect(typedAmount("9,00")).toBeNull()
		expect(typedAmount("1,2345")).toBeNull()
		expect(typedAmount("1 234,50")).toBeNull()
		expect(typedAmount("1 234")).toBeNull()
		expect(typedAmount(",500")).toBeNull()
	})

	test("refuses text that is not a decimal number", () => {
		expect(typedAmount("")).toBeNull()
		expect(typedAmount("1.2.3")).toBeNull()
		expect(typedAmount("0850")).toBeNull()
		expect(typedAmount("abc")).toBeNull()
		expect(typedAmount(".5")).toBeNull()
	})
})

describe("isDateText and slugId", () => {
	test("a date is YYYY-MM-DD in shape; the CLI checks the day", () => {
		expect(isDateText("2026-11-01")).toBe(true)
		expect(isDateText("2026-11-1")).toBe(false)
		expect(isDateText("01/11/2026")).toBe(false)
	})

	test("a name becomes its lower-case id, with each run of spaces as one dash", () => {
		expect(slugId("  Salary  Raise ")).toBe("salary-raise")
		expect(slugId("Bonus 2026")).toBe("bonus-2026")
		expect(slugId("   ")).toBe("")
	})
})

describe("uniqueId", () => {
	test("keeps a free id, and numbers a clash from two up", () => {
		expect(uniqueId("salary", [])).toBe("salary")
		expect(uniqueId("salary", ["salary"])).toBe("salary-2")
		expect(uniqueId("salary", ["salary", "salary-2"])).toBe("salary-3")
	})
})

describe("withoutKeys", () => {
	test("returns the object without the named keys, and the others as they were", () => {
		expect(withoutKeys({ a: 1, b: 2, c: { d: 3 } }, ["b"])).toEqual({ a: 1, c: { d: 3 } })
	})
})
