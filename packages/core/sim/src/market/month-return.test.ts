import { describe, expect, it } from "bun:test"
import { floorDiv, isqrt } from "./integer-root"
import { monthReturn, monthVolatility } from "./month-return"
import { wholeBasisPoints } from "./whole-bps"

describe("the month return of a yearly rate", () => {
	it("is 1.07^(1/12) - 1 = 56.541453 bps for 7 per cent, floored to a millionth of a bp", () => {
		expect(monthReturn(700, undefined)).toBe(56_541_453n)
	})

	it("is exactly 1 per cent for a nominal 12 per cent compounded monthly", () => {
		expect(monthReturn(1200, "monthly")).toBe(100_000_000n)
	})

	it("is 0 for 0 per cent, and just under 100 bps for 12.68 per cent (1.01^12 is 12.6825)", () => {
		expect(monthReturn(0, undefined)).toBe(0n)
		expect(monthReturn(1268, undefined)).toBe(99_981_303n)
	})

	it("is negative for a falling rate: -50 per cent a year is -5.6126 per cent a month", () => {
		expect(monthReturn(-5000, undefined)).toBe(-561_256_874n)
	})

	it("saturates at +100 per cent a month", () => {
		expect(monthReturn(50_000_000, undefined)).toBe(10n ** 10n)
	})

	it("treats a nominal quarterly rate as 1 + r/4 four times: 4 per cent is 1.01^4", () => {
		// (1.01)^4 = 1.04060401, so the month return is 1.04060401^(1/12) - 1 = 33.22 bps.
		expect(monthReturn(400, "quarterly")).toBe(33_222_835n)
	})
})

describe("a volatility scaled to a month", () => {
	it("is 15 per cent / sqrt 12 = 433.012702 bps", () => {
		expect(monthVolatility(1500)).toBe(433_012_702n)
	})

	it("is 0 for 0, and 12 per cent / sqrt 12 = 346.410162 bps", () => {
		expect(monthVolatility(0)).toBe(0n)
		expect(monthVolatility(1200)).toBe(346_410_162n)
	})
})

describe("whole basis points by largest remainder", () => {
	it("hands the surplus to the largest remainders, the lower index on a tie", () => {
		const half = 5n * 10n ** 11n
		const unit = 10n ** 12n
		// 0.5, 0.5, 0.5, 0.5: the total is 2, so the first two round up.
		expect(wholeBasisPoints([half, half, half, half])).toEqual([1n, 1n, 0n, 0n])
		// -0.4 and 0.4 total 0: floors -1 and 0 leave a surplus of 1, which goes to the larger remainder, -0.4.
		expect(wholeBasisPoints([-4n * 10n ** 11n, 4n * 10n ** 11n])).toEqual([0n, 0n])
		expect(wholeBasisPoints([unit, 3n * unit])).toEqual([1n, 3n])
	})
})

describe("integer helpers", () => {
	it("takes the floor square root and floors a negative division", () => {
		expect(isqrt(0n)).toBe(0n)
		expect(isqrt(99n)).toBe(9n)
		expect(isqrt(100n)).toBe(10n)
		expect(isqrt(10n ** 40n + 1n)).toBe(10n ** 20n)
		expect(floorDiv(-7n, 2n)).toBe(-4n)
		expect(floorDiv(7n, 2n)).toBe(3n)
		expect(floorDiv(-8n, 2n)).toBe(-4n)
	})
})
