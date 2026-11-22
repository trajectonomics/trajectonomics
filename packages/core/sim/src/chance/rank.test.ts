import { describe, expect, it } from "bun:test"
import { ascending, nearestRank } from "./rank"

describe("nearest rank", () => {
	it("returns the only value of a one-path sample at every level", () => {
		expect(nearestRank([7], 10)).toBe(7)
		expect(nearestRank([7], 90)).toBe(7)
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

	it("sorts safe integers by value, not as text", () => {
		expect(ascending([10, 9, 100])).toEqual([9, 10, 100])
	})
})
