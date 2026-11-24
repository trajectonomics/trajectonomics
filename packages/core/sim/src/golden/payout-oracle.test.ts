import { describe, expect, it } from "bun:test"
import { amounts, rowAt } from "../engine/test-helpers"
import { fund, payingSetup, projected } from "../engine/test-payout"
import type { Payout } from "../types"
import { type OraclePayoutInput, oraclePayouts } from "./oracle-payout"

const FREQUENCIES = [
	["monthly", 1],
	["quarterly", 3],
	["semiannual", 6],
	["annual", 12],
] as const
const ROUNDINGS = ["floor", "halfUp", "ceil"] as const

/** The engine's year-by-year payouts and closing value of the fund, beside the oracle's walk. */
function both(input: OraclePayoutInput, frequency: Payout["frequency"]) {
	const payout = {
		bps: input.bps,
		frequency,
		rounding: input.rounding,
		...(input.from === undefined ? {} : { start: input.from }),
		...(input.to === undefined ? {} : { end: input.to }),
	}
	const setup = payingSetup([fund(payout, { rate: input.rate })], {
		balances: { cash: 0, fund: Number(input.opening) },
		start: input.start,
		horizon: input.horizon,
		resolution: "month",
	})
	const projection = projected(setup)
	const engine = projection.annual.map((year) => year.payouts ?? 0)
	const walked = oraclePayouts(input)
	const oracle = projection.annual.map((year) =>
		Number(
			walked.paid
				.filter((item) => item.date >= year.from && item.date <= year.to)
				.reduce((sum, item) => sum + item.amount, 0n),
		),
	)
	return { engine, oracle, closing: amounts(rowAt(projection, input.horizon))["fund"], walked }
}

describe("payouts agree with an independent day-by-day walk", () => {
	// Opening 1,234,567,891 from a mid-period 15 March 2026 through the leap year 2028: every frequency, every
	// rounding, a rate that is zero, positive, odd and negative, so no payout date or day count is lucky.
	for (const rate of [0, 1000, 837, -300]) {
		for (const [frequency, months] of FREQUENCIES) {
			it(`at ${rate} bps paid ${frequency}, floor, half up and ceil`, () => {
				for (const rounding of ROUNDINGS) {
					const input = {
						opening: 1_234_567_891n,
						rate,
						bps: 435,
						months,
						rounding,
						start: "2026-03-15",
						horizon: "2029-02-10",
					}
					const found = both(input, frequency)
					expect(found.engine).toEqual(found.oracle)
					expect(BigInt(found.closing!)).toBe(found.walked.closing)
				}
			})
		}
	}

	it("keeps a window: from 1 Jul 2026 to 30 Jun 2028, monthly, half up", () => {
		const input = {
			opening: 987_654_321n,
			rate: 625,
			bps: 1200,
			months: 1,
			rounding: "halfUp",
			start: "2026-01-01",
			horizon: "2029-01-01",
			from: "2026-07-01",
			to: "2028-06-30",
		} as const
		const found = both(input, "monthly")
		expect(found.engine).toEqual(found.oracle)
		expect(found.walked.paid).toHaveLength(24)
		expect(BigInt(found.closing!)).toBe(found.walked.closing)
	})
})
