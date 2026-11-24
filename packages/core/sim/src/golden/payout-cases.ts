import { expense, income } from "../engine/test-flows"
import { emptyCarryIn, makeFixture, withCarryIn } from "../engine/test-helpers"
import { fund } from "../engine/test-payout"
import type { Fixture } from "../fixtures/fixture"
import type { AssetRule, Levy, ReturnModel } from "../types"
import type { ParityCase } from "./parity-cases"

const MONTHLY = { frequency: "monthly", start: "2026-01-01" } as const
const HALF = 2147483648

/** 15% of the gross `dividends`, settled on 31 March: what a payout's 10% withholding is credited to. */
export const dividendTax: Levy = withCarryIn(
	{
		id: "tax",
		period: { month: 1, day: 1 },
		settlement: { month: 3, day: 31 },
		measures: [
			{ id: "gross", op: "tally", label: "dividends", basis: "gross" },
			{ id: "due", op: "scale", of: "gross", num: 1500, den: 10_000, rounding: "halfUp" },
		],
		due: "due",
	},
	emptyCarryIn("2025-01-01"),
)

/**
 * A fund of 1,000,000,000 at 8% that pays 350 bps a year quarterly, half up, taxed at 10% at source as
 * `dividends`, over 2026 and the first quarter of 2027. Cash takes the net payouts, and a living cost
 * of 100,000 a month draws on it.
 */
export const payoutYear: Fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		fund(
			{ bps: 350, label: "dividends", prepayments: [{ levy: "tax", bps: 1000 }] },
			{ rate: 800 },
		),
	],
	balances: { cash: 5_000_000, fund: 1_000_000_000 },
	flows: [expense("living", 100_000, MONTHLY)],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2027-03-31",
	resolution: "month",
	levy: dividendTax,
})

/** The fund pays 600 bps a year monthly; the salary of 1,000,000 stops at the candidate month. */
export function payoutPlan(account: AssetRule): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, account],
		balances: { cash: 0, fund: 120_000_000 },
		flows: [income("salary", 1_000_000, MONTHLY), expense("living", 600_000, MONTHLY)],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
}

/** A flat month and a -15% month for the fund, equally weighted. */
const market: ReturnModel = {
	id: "payout-market",
	accounts: ["cash", "fund"],
	buckets: [
		{ returnsBps: [0, 0], weight: HALF },
		{ returnsBps: [0, -1500], weight: HALF },
	],
}

export const PAYOUT_PARITY_CASES: readonly ParityCase[] = [
	{ name: "payout-year", fixture: payoutYear, projectOptions: { cashflowBreakdown: true } },
	{
		name: "payout-fi",
		fixture: payoutPlan(fund({ bps: 600, frequency: "monthly" })),
		options: { method: "survival", minBufferMonths: 0 },
	},
	{
		name: "payout-chance",
		fixture: payoutPlan(fund({ bps: 600, frequency: "monthly" })),
		chance: { model: market, seed: "0123456789abcdef", paths: 4 },
	},
]
