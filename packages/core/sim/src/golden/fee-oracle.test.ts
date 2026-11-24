import { describe, expect, it } from "bun:test"
import { chargingSetup, fund } from "../engine/test-fee"
import { amounts, rowAt } from "../engine/test-helpers"
import { projected } from "../engine/test-payout"
import { type OracleFeeInput, oracleFees } from "./oracle-fee"

const ROUNDINGS = ["floor", "halfUp", "ceil"] as const

/** The engine's year-by-year fees and closing value of the fund, beside the oracle's walk. */
function both(input: OracleFeeInput) {
	const setup = chargingSetup(
		[fund({ bps: input.bps, rounding: input.rounding }, { rate: input.rate })],
		{
			balances: { cash: 0, fund: Number(input.opening) },
			start: input.start,
			horizon: input.horizon,
		},
	)
	const projection = projected(setup)
	const walked = oracleFees(input)
	const oracle = projection.annual.map((year) =>
		Number(
			walked.charged
				.filter((item) => item.date >= year.from && item.date <= year.to)
				.reduce((sum, item) => sum + item.amount, 0n),
		),
	)
	const engine = projection.annual.map((year) => year.fees ?? 0)
	return { engine, oracle, closing: amounts(rowAt(projection, input.horizon))["fund"], walked }
}

describe("fees agree with an independent day-by-day walk", () => {
	// Opening 1,234,567,891 from a mid-month 15 March 2026 through the leap year 2028: every rounding at a
	// rate that is zero, positive, odd and negative, and a fee that is small, odd and the largest, so no
	// month end, day count or tie is lucky.
	for (const rate of [0, 1000, 837, -300]) {
		for (const bps of [1, 150, 435, 10_000]) {
			it(`at ${rate} bps of rate and a fee of ${bps} bps, floor, half up and ceil`, () => {
				for (const rounding of ROUNDINGS) {
					const input = {
						opening: 1_234_567_891n,
						rate,
						bps,
						rounding,
						start: "2026-03-15",
						horizon: "2029-02-10",
					}
					const found = both(input)
					expect(found.engine).toEqual(found.oracle)
					expect(BigInt(found.closing!)).toBe(found.walked.closing)
					expect(found.walked.charged).toHaveLength(35)
				}
			})
		}
	}
})
