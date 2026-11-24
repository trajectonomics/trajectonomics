import { describe, expect, it } from "bun:test"
import { chargingSetup, fund } from "./test-fee"
import { amounts, rowAt } from "./test-helpers"
import { projected } from "./test-payout"

// 1,000,000,000 at 150 bps a year, charged on each month end: value / 800, hand-worked by exact fractions.
const HALF_UP = [
	1_250_000, 1_248_438, 1_246_877, 1_245_318, 1_243_762, 1_242_207, 1_240_654, 1_239_103, 1_237_555,
	1_236_008, 1_234_463, 1_232_920,
]
const FLOOR = [
	1_250_000, 1_248_437, 1_246_876, 1_245_318, 1_243_761, 1_242_207, 1_240_654, 1_239_103, 1_237_554,
	1_236_007, 1_234_462, 1_232_919,
]
const CEIL = [
	1_250_000, 1_248_438, 1_246_877, 1_245_319, 1_243_762, 1_242_208, 1_240_655, 1_239_104, 1_237_555,
	1_236_008, 1_234_463, 1_232_920,
]

const sum = (list: readonly number[]): number => list.reduce((a, b) => a + b, 0)

/** The fund after each month end of 2026, from a monthly Projection at rate 0. */
function funds(rounding: "floor" | "halfUp" | "ceil"): readonly number[] {
	const projection = projected(chargingSetup([fund({ rounding })], { resolution: "month" }))
	return projection.rows.map((row) => amounts(row)["fund"]!)
}

describe("a fee of 150 bps a year on 1,000,000,000 at a rate of 0", () => {
	for (const [name, charges] of [
		["half up", HALF_UP],
		["floor", FLOOR],
		["ceil", CEIL],
	] as const) {
		it(`charges the twelve month ends ${name}: ${sum(charges)} in all`, () => {
			const rounding = name === "half up" ? "halfUp" : name
			const values = funds(rounding)
			let left = 1_000_000_000
			const stepped = charges.map((charge) => (left -= charge))
			// Rows are month ends after the opening row: each is the fund once that month's fee left it.
			expect(values.slice(-12)).toEqual(stepped)
			expect(left).toBe(1_000_000_000 - sum(charges))
		})
	}

	it("reports their sum as `fees` and each Account's share, outside income, expense and interest", () => {
		const [year] = projected(chargingSetup([fund()])).annual
		expect(year?.fees).toBe(14_897_305)
		expect(year?.accountFees).toEqual([{ account: "fund", amount: 14_897_305 }])
		expect(year?.closingNetWorth).toBe(1_000_000_000 - 14_897_305)
		expect([year?.income, year?.expense, year?.interest, year?.unmet]).toEqual([0, 0, 0, 0])
	})

	it("explains the Account's change: growth at 600 bps less the fee, interest being the growth", () => {
		// 1,000,000,000 at an effective 6% for 2026 grows 60,000,000 before the fee; the twelve fees come off a
		// value that is growing, so they are larger than at a rate of 0. Net worth = opening + interest - fees.
		const [year] = projected(chargingSetup([fund({}, { rate: 600 })])).annual
		expect(year!.openingNetWorth + year!.interest - year!.fees!).toBe(year!.closingNetWorth)
		expect(year!.fees!).toBeGreaterThan(14_897_305)
		expect(year!.interest).toBeGreaterThan(59_000_000)
	})

	it("is no expense: the fund is charged though cash never moves and nothing is unmet", () => {
		const projection = projected(chargingSetup([fund()]))
		expect(amounts(rowAt(projection, "2026-12-31"))["cash"]).toBe(0)
		expect(projection.runsOut).toBeUndefined()
		expect(projection.unfundedContributions).toEqual([])
	})
})
