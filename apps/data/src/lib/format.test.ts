import { describe, expect, test } from "bun:test"
import { compactCount, displayCount, displayShare } from "./format"

describe("a table cell", () => {
	test("renders a missing number as n/a", () => {
		expect(displayCount(null)).toBe("n/a")
	})

	test("groups a count without changing it", () => {
		expect(displayCount(0)).toBe("0")
		expect(displayCount(1234567)).toBe("1,234,567")
	})
})

describe("a plan's share of the total", () => {
	test("is a percentage with one decimal", () => {
		expect(displayShare(0)).toBe("0.0%")
		expect(displayShare(0.5)).toBe("50.0%")
		expect(displayShare(1)).toBe("100.0%")
	})

	test("rounds to one decimal", () => {
		expect(displayShare(1 / 3)).toBe("33.3%")
		expect(displayShare(2 / 3)).toBe("66.7%")
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
})
