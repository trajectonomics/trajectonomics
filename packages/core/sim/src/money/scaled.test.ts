import { describe, expect, it } from "bun:test"
import { roundHalfUp } from "./round"
import { roundScaled, scaledRatio } from "./scaled"

function scaled(amount: bigint, numerator: bigint, denominator: bigint): bigint {
	return roundScaled(amount, scaledRatio(numerator, denominator), () =>
		roundHalfUp(amount * numerator, denominator),
	)
}

describe("roundScaled equals the exact half-up rounding", () => {
	it("rounds a tie up: 5 × 1/2 is 3 and 4 × 1/2 is 2", () => {
		expect(scaled(5n, 1n, 2n)).toBe(3n)
		expect(scaled(4n, 1n, 2n)).toBe(2n)
	})

	it("rounds just below and just above a half the way the exact division does", () => {
		const denominator = 10n ** 40n + 1n
		for (const offset of [-1n, 0n, 1n]) {
			const numerator = denominator / 2n + offset
			expect(scaled(1n, numerator, denominator)).toBe(roundHalfUp(numerator, denominator))
		}
	})

	it("matches over amounts, ratios above and below one, and a huge denominator", () => {
		const ratios: readonly (readonly [bigint, bigint])[] = [
			[10250n, 10000n],
			[10000n, 10250n],
			[3n ** 90n, 2n ** 120n],
			[7n ** 300n, 10n ** 250n],
			[10n ** 300n + 17n, 7n ** 350n],
		]
		for (const [numerator, denominator] of ratios) {
			const ratio = scaledRatio(numerator, denominator)
			for (let amount = 0n; amount < 3000n; amount += 7n) {
				const big = amount * 1_000_003n + 12_345_678_901n
				const exact = roundHalfUp(big * numerator, denominator)
				expect(roundScaled(big, ratio, () => exact)).toBe(exact)
				expect(scaled(amount, numerator, denominator)).toBe(
					roundHalfUp(amount * numerator, denominator),
				)
			}
		}
	})

	it("rounds an amount past the fast path's limit exactly", () => {
		const amount = 10n ** 40n + 3n
		expect(scaled(amount, 10250n, 10000n)).toBe(roundHalfUp(amount * 10250n, 10000n))
	})

	it("still refuses a negative amount", () => {
		expect(() => scaled(-1n, 1n, 2n)).toThrow(RangeError)
	})
})
