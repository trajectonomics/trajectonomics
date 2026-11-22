import { DEMO_MILESTONES } from "./milestones"

/** The ledger ids of the accounts a Scenario names. */
export type DemoAccountIds = { bank: string; fund: string; loan: string }

/** The Thai Levy the demo applies, and the salary label that makes it tax the salary. */
export const DEMO_TAX = { tax: "th-2026", label: "salary=income.section40_1" }

/** The day the salary stops in `base`, at the age of 60, and in `retire-early`, at 50. */
export const BASE_SALARY_END = "2050-05-14"
export const RETIRE_EARLY_SALARY_END = "2040-05-14"

/** The base Scenario document: integer minor units, integer basis points, the ledger's account ids. */
export function baseScenarioDocument(ids: DemoAccountIds): Record<string, unknown> {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 300 },
		accounts: [
			{ id: ids.bank, kind: "asset", rate: 100 },
			{ id: ids.fund, kind: "asset", rate: 500 },
			{ id: ids.loan, kind: "liability", rate: 500, compounding: "monthly" },
		],
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				frequency: "monthly",
				start: "2026-11-01",
				end: BASE_SALARY_END,
				amount: 9000000,
				growth: "inflation",
			},
			{
				id: "rent",
				kind: "expense",
				frequency: "monthly",
				start: "2026-11-01",
				amount: 1400000,
				growth: "inflation",
			},
			{
				id: "living",
				kind: "expense",
				frequency: "monthly",
				start: "2026-11-01",
				amount: 2800000,
				growth: "inflation",
			},
			{
				id: "car",
				kind: "contribution",
				target: ids.loan,
				frequency: "monthly",
				start: "2026-11-01",
				end: "2030-12-31",
				amount: 900000,
				growth: { bps: 0 },
			},
			{
				id: "fund",
				kind: "contribution",
				target: ids.fund,
				frequency: "monthly",
				start: "2026-11-01",
				end: BASE_SALARY_END,
				amount: 1500000,
				growth: "inflation",
			},
		],
		milestones: DEMO_MILESTONES,
		cashflow: {
			surplus: [{ account: ids.bank }],
			contribute: [ids.fund],
			withdraw: [ids.bank, ids.fund],
		},
	}
}
