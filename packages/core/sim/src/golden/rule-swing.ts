import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { ruledExpense } from "../engine/test-rules"
import type { Fixture } from "../fixtures/fixture"
import type { SpendingRule } from "../types"

/**
 * `drawdown`'s portfolio with two shocks: a 3,000,000 cost on 2026-06-15 that cuts it below the
 * guardrails' upper band, and a 9,000,000 gift on 2027-06-15 that lifts it past the lower band. A
 * guardrails rule on it cuts in 2027 and raises in 2028, 2029 and 2030; the other kinds never do.
 */
export function swing(rule: SpendingRule): Fixture {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 400 },
		],
		balances: { cash: 1_000_000, inv: 10_000_000 },
		flows: [
			ruledExpense("spending", rule, { frequency: "monthly", start: "2026-01-01" }),
			expense("tuition", 3_000_000, { frequency: "once", start: "2026-06-15" }),
			income("gift", 9_000_000, { frequency: "once", start: "2027-06-15", earned: false }),
		],
		surplus: [{ account: "inv" }],
		withdraw: ["cash", "inv"],
		inflation: 250,
		start: "2026-01-01",
		horizon: "2030-01-01",
		resolution: "month",
	})
}
