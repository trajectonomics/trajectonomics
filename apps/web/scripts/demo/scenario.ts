/** The ledger ids of the accounts a Scenario names. */
export type DemoAccountIds = { bank: string; fund: string; loan: string }

/** The Thai Levy the demo applies, and the salary label that makes it tax the salary. */
export const DEMO_TAX = { tax: "th-2026", label: "salary=income.section40_1" }

/** The day the salary stops in `base`, at the age of 60, and in `retire-early`, at 50. */
export const BASE_SALARY_END = "2050-05-14"
export const RETIRE_EARLY_SALARY_END = "2040-05-14"

/**
 * The fictional household of `base`, whose ages pin two dates (cli ADR-0048). `me` is 60 on the last day
 * of June 2050, and `mali` is 6 on the last day of September 2033; the Flows hold those dates, as the
 * household writes them. The salary is not pinned, because `retire-early` moves its end.
 */
export const DEMO_HOUSEHOLD = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
		{ id: "mali", role: "dependent", relation: "child", born: "2027-09", lifeExpectancy: 90 },
	],
	anchors: [
		{ path: "flows.fund.end", person: "me", age: 60 },
		{ path: "flows.school.start", person: "mali", age: 6 },
	],
}
const FUND_END = "2050-06-30"
const SCHOOL_START = "2033-09-30"

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
				id: "school",
				kind: "expense",
				frequency: "monthly",
				start: SCHOOL_START,
				amount: 800000,
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
				end: FUND_END,
				amount: 1500000,
				growth: "inflation",
			},
		],
		cashflow: {
			surplus: [{ account: ids.bank }],
			contribute: [ids.fund],
			withdraw: [ids.bank, ids.fund],
		},
	}
}
