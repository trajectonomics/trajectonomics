import { describe, expect, it } from "bun:test"
import { percentiles } from "./band"
import { ascending, nearestRank } from "./rank"

describe("nearest rank", () => {
	it("returns the only value of a one-path sample at every level", () => {
		expect(nearestRank([7], 10)).toBe(7)
		expect(nearestRank([7], 90)).toBe(7)
		expect(nearestRank([7], 100)).toBe(7)
	})

	it("takes the lower of two values up to level 50 and the upper above it", () => {
		// ceil(10 × 2 / 100) = 1, ceil(50 × 2 / 100) = 1, ceil(51 × 2 / 100) = 2, ceil(100 × 2 / 100) = 2.
		expect(nearestRank([3, 8], 10)).toBe(3)
		expect(nearestRank([3, 8], 50)).toBe(3)
		expect(nearestRank([3, 8], 51)).toBe(8)
		expect(nearestRank([3, 8], 100)).toBe(8)
	})

	it("takes index ceil(level × N / 100) − 1 of ten values", () => {
		const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect(nearestRank(ten, 10)).toBe(1)
		expect(nearestRank(ten, 50)).toBe(5)
		expect(nearestRank(ten, 90)).toBe(9)
		expect(nearestRank(ten, 100)).toBe(10)
	})

	it("steps up at the first level that needs the next value", () => {
		const eleven = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
		expect(nearestRank(eleven, 10)).toBe(2)
		expect(nearestRank(eleven, 50)).toBe(6)
	})

	it("reports a tied value and never interpolates between neighbours", () => {
		expect(nearestRank([5, 5, 7], 50)).toBe(5)
		expect(nearestRank([5, 5, 7], 75)).toBe(7)
	})

	it("takes the five levels of an even sample holding a tie", () => {
		// [1, 5, 5, 9]: ranks ceil(0.4) = 1, ceil(1) = 1, ceil(2) = 2, ceil(3) = 3, ceil(3.6) = 4.
		const levels = percentiles(ascending([5, 9, 5, 1]))
		expect(levels).toEqual([
			{ level: 10, value: 1 },
			{ level: 25, value: 1 },
			{ level: 50, value: 5 },
			{ level: 75, value: 5 },
			{ level: 90, value: 9 },
		])
	})

	it("sorts safe integers by value, not as text", () => {
		expect(ascending([10, 9, 100])).toEqual([9, 10, 100])
	})
})
