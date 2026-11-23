import { describe, expect, it } from "bun:test"
import { levelPayment, MAX_LEVEL_PAYMENTS } from "./level"

const monthly = { periodsPerYear: 12 } as const

describe("levelPayment: hand-computed loans", () => {
	// 100,000.00 = 10,000,000 cents at 6% nominal, compounded monthly: i = 0.005 a month.
	// (1.005)^12 ≈ 1.0616778, so the payment is 10,000,000 × 0.005 × 1.0616778 / 0.0616778
	// ≈ 860,664.30 cents, which is 8,606.64 rounded half up or down and 8,606.65 rounded up.
	it.each([
		["halfUp", 860_664],
		["floor", 860_664],
		["ceil", 860_665],
	] as const)("rounds 100,000.00 over 12 monthly payments %s", (rounding, expected) => {
		const payment = levelPayment({
			principal: 10_000_000,
			rate: 600,
			...monthly,
			payments: 12,
			rounding,
		})
		expect(payment).toBe(expected)
	})

	// The classic 30-year loan: 100,000.00 at 6% a year, 360 monthly payments, 599.55 a month.
	it("prices a 30-year monthly loan at 599.55", () => {
		const payment = levelPayment({
			principal: 10_000_000,
			rate: 600,
			...monthly,
			payments: 360,
			rounding: "halfUp",
		})
		expect(payment).toBe(59_955)
	})

	// One payment pays the principal and one period's interest: 100,000.00 × 1.005 = 100,500.00.
	it("prices a single payment as the principal plus one period's interest", () => {
		for (const rounding of ["floor", "halfUp", "ceil"] as const) {
			expect(
				levelPayment({ principal: 10_000_000, rate: 600, ...monthly, payments: 1, rounding }),
			).toBe(10_050_000)
		}
	})
})

describe("levelPayment: quarterly and annual loans", () => {
	// 777,777 at 12.34% a year, compounded quarterly: i = 0.03085 a quarter and (1.03085)^40 ≈ 3.3710,
	// so the payment is 777,777 × 0.03085 × 3.3710 / 2.3710 ≈ 34,112.38 minor units.
	it.each([
		["floor", 34_112],
		["halfUp", 34_112],
		["ceil", 34_113],
	] as const)("prices 777,777 over 40 quarterly payments, %s", (rounding, expected) => {
		expect(
			levelPayment({
				principal: 777_777,
				rate: 1234,
				periodsPerYear: 4,
				payments: 40,
				rounding,
			}),
		).toBe(expected)
	})

	// 100,000 at 5% a year, paid once a year: (1.05)^7 ≈ 1.4071, so the payment is
	// 100,000 × 0.05 × 1.4071 / 0.4071 ≈ 17,281.98 minor units.
	it.each([
		["floor", 17_281],
		["halfUp", 17_282],
		["ceil", 17_282],
	] as const)("prices 100,000 over 7 annual payments, %s", (rounding, expected) => {
		expect(
			levelPayment({ principal: 100_000, rate: 500, periodsPerYear: 1, payments: 7, rounding }),
		).toBe(expected)
	})
})

describe("levelPayment: an exact half", () => {
	// 5 over 2 payments at no rate is exactly 2.5: a tie that halfUp rounds up, where floor does not.
	it("rounds an exact half up under halfUp, and only then", () => {
		const base = { rate: 0, ...monthly, payments: 2 } as const
		expect(levelPayment({ ...base, principal: 5, rounding: "halfUp" })).toBe(3)
		expect(levelPayment({ ...base, principal: 5, rounding: "floor" })).toBe(2)
		expect(levelPayment({ ...base, principal: 5, rounding: "ceil" })).toBe(3)
	})

	// 7 over 2 payments is exactly 3.5, which halfUp takes to 4.
	it("rounds 3.5 to 4 under halfUp", () => {
		expect(
			levelPayment({ principal: 7, rate: 0, ...monthly, payments: 2, rounding: "halfUp" }),
		).toBe(4)
	})
})

describe("levelPayment: zero rate", () => {
	// 1,200.00 over 12 payments is exactly 100.00 each.
	it("divides the principal evenly when the rate is zero", () => {
		expect(
			levelPayment({ principal: 120_000, rate: 0, ...monthly, payments: 12, rounding: "halfUp" }),
		).toBe(10_000)
	})

	// One cent over three payments: 33.33 cents rounds to 33 or 34 by the stated rounding, so the
	// schedule leaves a cent to settle on the last payment.
	it("rounds an uneven division once, as the caller states", () => {
		expect(
			levelPayment({ principal: 100, rate: 0, ...monthly, payments: 3, rounding: "halfUp" }),
		).toBe(33)
		expect(
			levelPayment({ principal: 100, rate: 0, ...monthly, payments: 3, rounding: "ceil" }),
		).toBe(34)
	})
})

describe("levelPayment: refusal and range", () => {
	it("returns undefined for a payment count outside 1..the calendar's periods", () => {
		const base = { principal: 10_000_000, rate: 600, ...monthly, rounding: "halfUp" } as const
		expect(levelPayment({ ...base, payments: 0 })).toBeUndefined()
		expect(levelPayment({ ...base, payments: MAX_LEVEL_PAYMENTS + 1 })).toBeUndefined()
		expect(levelPayment({ ...base, payments: 1.5 })).toBeUndefined()
	})

	it("returns undefined for a negative principal or a negative rate", () => {
		const base = { ...monthly, payments: 12, rounding: "halfUp" } as const
		expect(levelPayment({ ...base, principal: -1, rate: 600 })).toBeUndefined()
		expect(levelPayment({ ...base, principal: 1, rate: -1 })).toBeUndefined()
	})

	it("returns undefined when the payment is not a safe integer", () => {
		// 90 billion-ish principal at 600 bps over one payment is just above the safe integer range.
		expect(
			levelPayment({
				principal: Number.MAX_SAFE_INTEGER,
				rate: 600,
				...monthly,
				payments: 1,
				rounding: "halfUp",
			}),
		).toBeUndefined()
	})
})
