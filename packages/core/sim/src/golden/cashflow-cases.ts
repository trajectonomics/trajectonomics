import { contribution, expense, income, prepays } from "../engine/test-flows"
import { emptyCarryIn, withCarryIn } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { TH_LIKE } from "../levy/th-levy"
import type { Flow } from "../types"

const salary = income("salary", 1_000_000, {
	frequency: "monthly",
	start: "2026-01-31",
	label: "salary",
	prepayments: prepays(TH_LIKE.id, 500),
})
const passive = income("passive", 300_000, { earned: false, start: "2026-06-15" })
const living = {
	...expense("living", 200_000, { frequency: "monthly", start: "2026-01-31" }),
	category: "essentials",
}
const school = expense("school", 150_000, { frequency: "quarterly", start: "2026-03-31" })
const car = { ...expense("car", 1_200_000, { start: "2026-05-20" }), category: "car" }
const loanPayment = contribution("loan-payment", "loan", 100_000, {
	frequency: "monthly",
	start: "2026-01-31",
})
const savingsTopUp = contribution("ssf", "savings", 1_000_000, {
	frequency: "monthly",
	start: "2026-01-31",
})
const borrow: Flow = {
	id: "borrow",
	kind: "withdrawal",
	source: "loan",
	amount: 500_000,
	frequency: "once",
	start: "2026-07-10",
	growth: { bps: 0 },
}

/**
 * The hand-worked year of the cash-flow breakdown: a Thai Levy with a 5% Prepayment, two incomes, a
 * categorised and an uncategorised expense, a contribution cut by Available cashflow, a debt payment,
 * a planned withdrawal, a shortfall paid from `withdraw` and surplus that fills `cash` to its cap first.
 */
export const handCase: Fixture = {
	baseline: {
		schemaVersion: 1,
		balances: [
			{ account: "cash", amount: 0 },
			{ account: "savings", amount: 0 },
			{ account: "loan", amount: 1_000_000 },
		],
	},
	scenario: {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "savings", kind: "asset", rate: 0 },
			{ id: "loan", kind: "liability", rate: 0 },
		],
		flows: [salary, passive, living, school, car, loanPayment, savingsTopUp, borrow],
		cashflow: {
			surplus: [{ account: "cash", upTo: 100_000 }, { account: "savings" }],
			contribute: ["savings"],
			withdraw: ["savings", "cash"],
		},
		levies: [withCarryIn(TH_LIKE, emptyCarryIn("2025-01-01"))],
	},
	timeline: { start: "2026-01-01", horizon: "2026-12-31", resolution: "month" },
}
