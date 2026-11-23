import { describe, expect, it } from "bun:test"
import { derivedIncome, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { financialIndependence, project } from "../index"
import type { Derive, ReturnModel } from "../types"

const SEED = "0000000000000000"
const flat: ReturnModel = {
	id: "flat",
	accounts: ["inv"],
	buckets: [{ returnsBps: [500], weight: 4294967296 }],
}

// The bonus reads inv less 1,000,000, a thousandth of it: negative whenever inv is below 1,000,000.
const bonus: Derive = {
	measures: [
		{ id: "value", op: "account", account: "inv" },
		{ id: "floor", op: "const", value: 1_000_000 },
		{ id: "over", op: "sub", a: "value", b: "floor" },
		{ id: "share", op: "scale", of: "over", num: 1, den: 1000, rounding: "halfUp" },
	],
	result: "share",
}
const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }

function setup() {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 500 },
		],
		balances: { cash: 0, inv: 1_200_000 },
		flows: [
			income("salary", 500_000, { ...monthly, earned: true }),
			expense("living", 150_000, monthly),
			derivedIncome("bonus", bonus, { frequency: "annual", start: "2026-06-15", earned: true }),
		],
		surplus: [{ account: "inv" }],
		withdraw: ["cash", "inv"],
		start: "2026-01-01",
		horizon: "2031-01-01",
		resolution: "month",
	})
}

// The window sums only expenses, and an expense cannot read earned income, so a stopped earned
// bonus is never priced: the candidate's depleted inv must not fail the run with NEGATIVE_AMOUNT.
describe("an FI window with a stopped earned Derived income that reads an Account (#376)", () => {
	for (const method of ["survival", "probabilityThreshold"] as const) {
		it(`is not priced from the candidate's depleted values: ${method}`, () => {
			const { baseline, scenario, timeline } = setup()
			expect(project(baseline, scenario, timeline).ok).toBe(true)
			const result =
				method === "survival"
					? financialIndependence(baseline, scenario, timeline, {
							method,
							minBufferMonths: 0,
							reference,
						} as never)
					: financialIndependence(
							baseline,
							scenario,
							timeline,
							{ method: "probabilityThreshold", thresholdBps: 5000, paths: 4, seed: SEED },
							flat,
						)
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			expect(result.ok).toBe(true)
		})
	}
})
