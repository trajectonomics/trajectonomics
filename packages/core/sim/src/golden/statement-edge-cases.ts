import { income } from "../engine/test-flows"
import type { Fixture } from "../fixtures/fixture"
import type { Account } from "../types"
import { loanFixture } from "./statement-cases"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const pay = income("pay", 1_000_000, { frequency: "monthly", start: "2026-01-01" })

/** A 0% nominal loan of 1,200,000 repaid as 12 equal month-end payments of 100,000. */
export const zeroRateLoan: Fixture = loanFixture(
	[
		pay,
		{
			id: "repay",
			kind: "contribution",
			target: "loan",
			frequency: "monthly",
			start: "2026-01-31",
			level: { principal: 1_200_000, payments: 12, rounding: "ceil" },
		},
	],
	{ start: "2025-12-31", horizon: "2026-12-31", resolution: "month" },
	1_200_000,
	[cash, { id: "loan", kind: "liability", rate: 0, compounding: "monthly" }],
)

/** The reviewer-checked loan: 1,000,000.00 at 6% nominal monthly, 360 payments, half up (599,551). */
export const longLoan: Fixture = loanFixture(
	[
		pay,
		{
			id: "repay",
			kind: "contribution",
			target: "loan",
			frequency: "monthly",
			start: "2026-01-31",
			level: { principal: 100_000_000, payments: 360, rounding: "halfUp" },
		},
	],
	{ start: "2025-12-31", horizon: "2026-06-30", resolution: "month" },
	100_000_000,
)

/** No income, so the cash runs out on 15 February while the loan is still owed. */
export const runOutLoan: Fixture = loanFixture(
	[
		{
			id: "rent",
			kind: "expense",
			frequency: "once",
			start: "2026-02-15",
			amount: 5_000_000,
			growth: { bps: 0 },
		},
	],
	{ start: "2025-12-31", horizon: "2026-06-30", resolution: "month" },
)
