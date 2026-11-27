import { describe, expect, it } from "bun:test"
import { addMonthsClamped } from "../calendar/arith"
import { deflateBy, inflateBy, type PricePath } from "./inflation"
import { steps } from "./price-path"
import { roundHalfUp } from "./round"

const START = "2026-01-01"
const path: PricePath = { start: START, ratesBps: [100, 500, 300], outsideBps: 700 }

describe("a price path outside its drawn years", () => {
	it("uses outsideBps for the years before 0: 5 years ending in year 2", () => {
		const amount = 1_000_000_000n
		const num = 10_700n ** 3n * 10_100n * 10_500n
		const den = 10_000n ** 5n
		expect(inflateBy(amount, path, 5, addMonthsClamped(START, 24))).toBe(
			roundHalfUp(amount * num, den),
		)
	})

	it("uses outsideBps past the last drawn year: 5 counted years", () => {
		const amount = 1_000_000_000n
		const num = 10_100n * 10_500n * 10_300n * 10_700n ** 2n * 3_650_000n
		const den = 10_000n ** 5n * 3_650_000n
		expect(deflateBy(amount, path, 5 * 365)).toBe(roundHalfUp(amount * den, num))
	})

	it("multiplies the outside rate into steps before year 0", () => {
		expect(steps(path, -2, 1).num).toBe(10_700n ** 2n * 10_100n)
	})
})
