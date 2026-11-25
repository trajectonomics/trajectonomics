import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { ParityCase } from "./parity-cases"

/**
 * A fund of 1,000,000,000 at a total return of 0% that pays 350 bps a year quarterly and is charged 100 bps
 * a year, both rounded half up, over 2026, every payout landing in cash (ADR 0027, 0028).
 */
export const lifetimeYear: Fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{
			id: "fund",
			kind: "asset",
			rate: 0,
			payout: { bps: 350, frequency: "quarterly", rounding: "halfUp" },
			fee: { bps: 100, rounding: "halfUp" },
		},
	],
	balances: { cash: 0, fund: 1_000_000_000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-31",
	resolution: "month",
})

export const LIFETIME_PARITY_CASES: readonly ParityCase[] = [
	{ name: "lifetime-year", fixture: lifetimeYear, projectOptions: { cashflowBreakdown: true } },
]
