import { fund } from "../engine/test-fee"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { AssetRule, ReturnModel } from "../types"
import type { ParityCase } from "./parity-cases"

const MONTHLY = { frequency: "monthly", start: "2026-01-01" } as const
const HALF = 2147483648

/**
 * A fund of 1,000,000,000 at 6% that charges 150 bps a year, and a locked fund of 200,000,000 that
 * charges 80, over 2026 and 2027, beside cash that pays a living cost of 100,000 a month.
 */
export const feeYear: Fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		fund({}, { rate: 600 }),
		fund({ bps: 80, rounding: "floor" }, { id: "locked", rate: 400, lockedUntil: "2030-01-01" }),
	],
	balances: { cash: 5_000_000, fund: 1_000_000_000, locked: 200_000_000 },
	flows: [expense("living", 100_000, MONTHLY)],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2027-12-31",
	resolution: "month",
})

/** Salary 1,000,000 a month, living 600,000, a fund of 50,000,000 at 0% that the cashflow draws on. */
export function feePlan(account: AssetRule): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, account],
		balances: { cash: 0, fund: 50_000_000 },
		flows: [income("salary", 1_000_000, MONTHLY), expense("living", 600_000, MONTHLY)],
		surplus: [{ account: "cash" }],
		withdraw: ["cash", "fund"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
}

/** A flat month and a -15% month for the fund, equally weighted. */
const market: ReturnModel = {
	id: "fee-market",
	accounts: ["cash", "fund"],
	buckets: [
		{ returnsBps: [0, 0], weight: HALF },
		{ returnsBps: [0, -1500], weight: HALF },
	],
}

export const FEE_PARITY_CASES: readonly ParityCase[] = [
	{ name: "fee-year", fixture: feeYear, projectOptions: { cashflowBreakdown: true, estate: true } },
	{
		name: "fee-fi",
		fixture: feePlan(fund({ bps: 150 })),
		options: { method: "survival", minBufferMonths: 0 },
	},
	{
		name: "fee-chance",
		fixture: feePlan(fund({ bps: 150 })),
		chance: { model: market, seed: "0123456789abcdef", paths: 4 },
	},
]
