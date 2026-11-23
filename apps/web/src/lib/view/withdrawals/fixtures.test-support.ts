import { type ScenarioDocument, scenarioDocument } from "../../contract"
import type { WithdrawalContext } from "./context"

/** A plan with a retirement Milestone, two liquid assets, a home and a debt, and two expenses: rent runs on, gym ends. */
export const DOC: ScenarioDocument = scenarioDocument.parse({
	currency: "THB",
	accounts: [
		{ id: "cash", kind: "asset", rate: 100 },
		{ id: "index", kind: "asset", rate: 500 },
		{ id: "pension", kind: "asset", rate: 400 },
		{ id: "home", kind: "asset", rate: 0, liquid: false },
		{ id: "loan", kind: "liability", rate: 500 },
	],
	flows: [
		{
			id: "salary",
			kind: "income",
			earned: true,
			frequency: "monthly",
			start: "2026-01-01",
			amount: "100000.00",
			growth: "inflation",
			endAt: "retire",
		},
		{
			id: "rent",
			kind: "expense",
			frequency: "monthly",
			start: "2026-01-01",
			amount: "20000.00",
			growth: "inflation",
		},
		{
			id: "gym",
			kind: "expense",
			frequency: "monthly",
			start: "2026-01-01",
			end: "2030-12-31",
			amount: "1000.00",
			growth: "inflation",
		},
	],
	milestones: [{ id: "retire" }, { id: "other" }],
	cashflow: { withdraw: ["cash", "index", "home"], surplus: [], contribute: [] },
})

/** The context of that plan; `retire` fired on 1 Jan 2045. */
export const CTX: WithdrawalContext = {
	doc: DOC,
	asOf: "2026-10-31",
	milestoneDates: { retire: "2045-01-01" },
}
