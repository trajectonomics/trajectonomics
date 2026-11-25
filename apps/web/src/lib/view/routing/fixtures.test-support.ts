import type { ScenarioDocument } from "../../contract"
import type { AccountNames } from "../account-names"

/** A plan with routing: a bank, an emergency fund, a fund, a home that cannot be drawn on, and a loan. */
export function planWith(cashflow: ScenarioDocument["cashflow"]): ScenarioDocument {
	return {
		currency: "THB",
		flows: [],
		accounts: [
			{ id: "bank", kind: "asset", rate: 100 },
			{ id: "emergency", kind: "asset", rate: 100 },
			{ id: "fund", kind: "asset", rate: 500 },
			{ id: "home", kind: "asset", rate: 0, liquid: false },
			{ id: "loan", kind: "liability", rate: 500 },
		],
		...(cashflow === undefined ? {} : { cashflow }),
	}
}

export const NAMES: AccountNames = new Map([
	["bank", "Savings"],
	["emergency", "Emergency fund"],
	["fund", "Funds"],
])
