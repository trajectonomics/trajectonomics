import { describe, expect, it } from "bun:test"
import { addMonthsClamped } from "../calendar/arith"
import { deflate, grow } from "./growth"
import { deflateBy, inflateBy, type PricePath } from "./inflation"

const START = "2026-01-01"
const RATES = [-500, 0, 317, 10000]
const AMOUNTS = [1n, 999n, 10n ** 15n]

function flat(rate: number, years = 45): PricePath {
	return { start: START, ratesBps: Array.from({ length: years }, () => rate), outsideBps: rate }
}

describe("inflateBy", () => {
	it("equals grow on a flat path, at every rate and step count", () => {
		for (const rate of RATES) {
			const path = flat(rate)
			for (let n = 0; n <= 40; n++) {
				const date = addMonthsClamped(START, n * 12)
				for (const amount of AMOUNTS) {
					expect(inflateBy(amount, path, n, date)).toBe(grow(amount, rate, n * 365))
				}
			}
		}
	})

	it("equals grow on a scalar rate, and returns 0 for zero", () => {
		expect(inflateBy(999n, 317, 3, START)).toBe(grow(999n, 317, 3 * 365))
		expect(inflateBy(0n, flat(317), 3, addMonthsClamped(START, 36))).toBe(0n)
		expect(inflateBy(999n, flat(317), 0, START)).toBe(999n)
	})

	it("refuses a negative amount, as grow does", () => {
		expect(() => grow(-5n, 317, 365)).toThrow(RangeError)
		expect(() => inflateBy(-5n, flat(317), 1, addMonthsClamped(START, 12))).toThrow(RangeError)
	})
})

describe("deflateBy", () => {
	it("equals deflate on a flat path at whole years", () => {
		for (const rate of RATES) {
			const path = flat(rate)
			for (let years = 0; years <= 40; years++) {
				const days = years * 365
				for (const amount of AMOUNTS) {
					expect(deflateBy(amount, path, days)).toBe(deflate(amount, rate, days))
				}
			}
		}
	})

	it("equals deflate on a scalar rate, and returns 0 for zero", () => {
		expect(deflateBy(10n ** 12n, 317, 400)).toBe(deflate(10n ** 12n, 317, 400))
		expect(deflateBy(0n, flat(317), 400)).toBe(0n)
		expect(deflateBy(999n, flat(317), 0)).toBe(999n)
	})

	it("is at most the scalar mid-year, within 2 basis points at 300", () => {
		const amount = 10n ** 15n
		for (let rest = 1; rest < 365; rest++) {
			const linear = deflateBy(amount, flat(300), 365 + rest)
			const compound = deflate(amount, 300, 365 + rest)
			expect(linear <= compound).toBe(true)
			expect((compound - linear) * 10_000n <= 2n * linear).toBe(true)
		}
	})
})
