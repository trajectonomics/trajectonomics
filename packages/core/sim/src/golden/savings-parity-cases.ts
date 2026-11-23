import { contribution, income, prepays } from "../engine/test-flows"
import { emptyCarryIn, makeFixture, withCarryIn } from "../engine/test-helpers"
import { TH_LIKE } from "../levy/th-levy"
import type { ParityCase } from "./parity-cases"

/**
 * A 1,200,000.00 salary year under TH_LIKE with 60,000.00 already saved under `fund`. The allowance
 * is capped at 15% of income, 180,000.00, so 50,000.00 steps from there take three steps and the
 * third only partly pays.
 */
const salaryWithSaving = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "fund-account", kind: "asset", rate: 0 },
	],
	balances: { cash: 0, "fund-account": 0 },
	flows: [
		income("salary", 10_000_000, {
			frequency: "monthly",
			start: "2026-01-31",
			label: "salary",
			prepayments: prepays(TH_LIKE.id, 500),
		}),
		contribution("fund", "fund-account", 500_000, {
			frequency: "monthly",
			start: "2026-01-31",
			label: "fund",
		}),
	],
	surplus: [{ account: "cash" }],
	contribute: ["fund-account"],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2027-03-31",
	resolution: "month",
	levy: withCarryIn(TH_LIKE, emptyCarryIn("2025-01-01")),
})

/** Contribution savings on a projected Settlement period, pinned under every engine. */
export const SAVINGS_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "levy-contribution-savings",
		fixture: salaryWithSaving,
		savings: {
			period: "2026-01-01",
			options: { labels: ["fund"], step: 5_000_000, inflation: 0, maxSteps: 100 },
		},
	},
]
