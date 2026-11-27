import { describe, expect, test } from "bun:test"
import { compactCount, displayCount } from "./format"

describe("a table cell", () => {
	test("renders a missing number as n/a", () => {
		expect(displayCount(null)).toBe("n/a")
	})

	test("groups a count without changing it", () => {
		expect(displayCount(0)).toBe("0")
		expect(displayCount(1234567)).toBe("1,234,567")
	})
})

describe("a chart axis label", () => {
	test("stays plain below a thousand", () => {
		expect(compactCount(0)).toBe("0")
		expect(compactCount(999)).toBe("999")
	})

	test("uses one decimal under ten of a unit", () => {
		expect(compactCount(1_500)).toBe("1.5K")
		expect(compactCount(12_500)).toBe("12.5K")
	})

	test("names each large unit", () => {
		expect(compactCount(2_000_000)).toBe("2M")
		expect(compactCount(3_000_000_000)).toBe("3B")
		expect(compactCount(4_000_000_000_000)).toBe("4T")
	})

	test("cuts the decimal toward zero instead of rounding up", () => {
		expect(compactCount(1_999)).toBe("1.9K")
		expect(compactCount(999_999)).toBe("999.9K")
		expect(compactCount(251_599_999)).toBe("251.5M")
		expect(compactCount(12.99)).toBe("12.9")
	})
})
