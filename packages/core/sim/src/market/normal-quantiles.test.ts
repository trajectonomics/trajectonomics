import { describe, expect, it } from "bun:test"
import { distanceToBoundary, oracleHalfTable, roundToMillionths } from "../golden/oracle-normal"
import { normalQuantiles } from "./normal-quantiles"

const SIZES = [16, 32, 64, 128, 256, 512, 1024]

/** Sum of the upper half, and the sum of its squares, pinned from the committed table. */
const PINS: Readonly<Record<number, readonly [number, number]>> = {
	16: [6264151, 7389446588601],
	32: [12653265, 15378455261399],
	64: [25425351, 31369975595241],
	128: [50963146, 63363255352148],
	256: [102032697, 127357801502547],
	512: [204166337, 255353297057327],
	1024: [408428706, 511349524390602],
}

describe("the standard normal quantile table", () => {
	it("is the 16-bucket table by hand: the quantiles at 1/32, 3/32, ... in millionths", () => {
		expect(normalQuantiles(16).slice(8)).toEqual([
			78412, 237202, 402250, 579132, 776422, 1009990, 1318011, 1862732,
		])
	})

	it("is re-derived from the oracle for every size, rounded half up to a millionth", () => {
		for (const buckets of SIZES) {
			const half = oracleHalfTable(buckets)
			expect(normalQuantiles(buckets).slice(buckets / 2)).toEqual(
				half.map((value) => Number(roundToMillionths(value))),
			)
		}
	})

	it("never sits within 100 trillionths of a rounding boundary, so the rounding is not a coin flip", () => {
		for (const buckets of SIZES) {
			for (const value of oracleHalfTable(buckets)) {
				expect(distanceToBoundary(value) > 100n).toBe(true)
			}
		}
	})

	it("is odd-symmetric, ascending and sums to exactly 0", () => {
		for (const buckets of SIZES) {
			const table = normalQuantiles(buckets)
			expect(table).toHaveLength(buckets)
			expect(table.reduce((sum, value) => sum + value, 0)).toBe(0)
			table.forEach((value, index) => {
				expect(value).toBe(-table[buckets - 1 - index]!)
				if (index > 0) expect(value > table[index - 1]!).toBe(true)
			})
		}
	})

	it("pins every table by the sum and the sum of squares of its upper half", () => {
		for (const buckets of SIZES) {
			const upper = normalQuantiles(buckets).slice(buckets / 2)
			const sum = upper.reduce((total, value) => total + value, 0)
			const squares = upper.reduce((total, value) => total + value * value, 0)
			expect([sum, squares]).toEqual([...PINS[buckets]!])
		}
	})

	it("has a spread just under 1: variance within 1.4 / buckets below the standard normal's 1", () => {
		for (const buckets of SIZES) {
			const upper = normalQuantiles(buckets).slice(buckets / 2)
			const squares = upper.reduce((total, value) => total + value * value, 0)
			const variance = 2 * squares
			// variance / buckets / 10^12 < 1, and >= 1 - 1.4 / buckets, in integers.
			expect(variance < buckets * 10 ** 12).toBe(true)
			expect(variance * 10 >= 10 ** 12 * (10 * buckets - 14)).toBe(true)
		}
	})

	it("refuses a size it has no table for", () => {
		expect(() => normalQuantiles(20)).toThrow(RangeError)
	})
})
