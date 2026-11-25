import { describe, expect, test } from "bun:test"
import { parseRange, RANGES, rowsInRange } from "./range"

describe("the range", () => {
	test("offers the next 10, 20 and 30 years and the whole plan", () => {
		expect(RANGES.map((range) => [range.id, range.years])).toEqual([
			["10", 10],
			["20", 20],
			["30", 30],
			["all", null],
		])
	})

	test("an unknown address-bar value reads as the whole plan", () => {
		expect(parseRange("20").years).toBe(20)
		expect(parseRange("").id).toBe("all")
		expect(parseRange("forever").id).toBe("all")
	})

	test("chooses the first rows and makes none: the whole plan keeps every row", () => {
		const rows = Array.from({ length: 28 }, (_, index) => ({ index }))
		expect(rowsInRange(rows, parseRange("10"))).toEqual(rows.slice(0, 10))
		expect(rowsInRange(rows, parseRange("30"))).toEqual(rows)
		expect(rowsInRange(rows, parseRange("all"))).toBe(rows)
		expect(rowsInRange(rows.slice(0, 4), parseRange("10"))).toHaveLength(4)
	})
})
