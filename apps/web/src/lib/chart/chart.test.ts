import { describe, expect, test } from "bun:test"
import { extent } from "./extent"
import { nearestIndex } from "./nearest"
import { areaPath, linePath } from "./path"
import { linearScale } from "./scale"
import { shares } from "./shares"
import { niceTicks } from "./ticks"
import { toChartNumber } from "./number"

describe("toChartNumber", () => {
	test("places a decimal money string as a number", () => {
		expect(toChartNumber("-94000.00")).toBe(-94000)
		expect(toChartNumber("1082000.00")).toBe(1082000)
	})

	test("refuses a string that is not a decimal money string", () => {
		expect(() => toChartNumber("1,000.00")).toThrow(RangeError)
		expect(() => toChartNumber("")).toThrow(RangeError)
	})
})

describe("extent", () => {
	test("returns the smallest and largest value", () => {
		expect(extent([3, -1, 7])).toEqual({ min: -1, max: 7 })
	})

	test("returns null for no values, and refuses a value that is not finite", () => {
		expect(extent([])).toBeNull()
		expect(() => extent([1, Number.POSITIVE_INFINITY])).toThrow(RangeError)
	})
})

describe("linearScale", () => {
	test("maps the domain ends to the range ends, flipped for a pixel y axis", () => {
		const scale = linearScale({ min: 0, max: 100 }, { from: 200, to: 0 })
		expect(scale(0)).toBe(200)
		expect(scale(100)).toBe(0)
		expect(scale(50)).toBe(100)
	})

	test("maps a flat domain to the middle of the range", () => {
		const scale = linearScale({ min: 5, max: 5 }, { from: 0, to: 100 })
		expect(scale(5)).toBe(50)
	})
})

describe("niceTicks", () => {
	test("covers the domain with round steps of 1, 2 or 5", () => {
		expect(niceTicks({ min: 0, max: 1082000 })).toEqual([
			0, 200000, 400000, 600000, 800000, 1000000, 1200000,
		])
	})

	test("encloses a domain that does not start at a round number", () => {
		const ticks = niceTicks({ min: 93000, max: 1082000 })
		expect(ticks[0]).toBeLessThanOrEqual(93000)
		expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(1082000)
	})

	test("produces no binary noise on a fractional step", () => {
		expect(niceTicks({ min: 0, max: 0.3 }, 4)).toEqual([0, 0.1, 0.2, 0.3])
	})

	test("returns one tick for a flat domain, and refuses fewer than two ticks", () => {
		expect(niceTicks({ min: 7, max: 7 })).toEqual([7])
		expect(() => niceTicks({ min: 0, max: 1 }, 1)).toThrow(RangeError)
	})
})

describe("linePath and areaPath", () => {
	const points = [
		{ x: 0, y: 10 },
		{ x: 5.126, y: 20 },
	]

	test("moves to the first point and draws a line to each next", () => {
		expect(linePath(points)).toBe("M0 10 L5.13 20")
	})

	test("is empty for no points", () => {
		expect(linePath([])).toBe("")
		expect(areaPath([], 100)).toBe("")
	})

	test("closes the area down to the baseline and back to the first point", () => {
		expect(areaPath(points, 100)).toBe("M0 10 L5.13 20 L5.13 100 L0 100 Z")
	})
})

describe("shares", () => {
	test("returns each value's share of the total", () => {
		expect(shares([1, 3])).toEqual([0.25, 0.75])
	})

	test("returns zeros when every value is zero", () => {
		expect(shares([0, 0])).toEqual([0, 0])
	})

	test("refuses a negative or non-finite value", () => {
		expect(() => shares([1, -1])).toThrow(RangeError)
		expect(() => shares([Number.NaN])).toThrow(RangeError)
	})
})

describe("nearestIndex", () => {
	test("returns the position closest to the target", () => {
		expect(nearestIndex([0, 100, 200], 140)).toBe(1)
	})

	test("returns the earlier position on a tie, and -1 for no positions", () => {
		expect(nearestIndex([0, 100], 50)).toBe(0)
		expect(nearestIndex([], 50)).toBe(-1)
	})
})
