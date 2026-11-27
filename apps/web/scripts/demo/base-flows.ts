/** The ledger ids of the accounts a Scenario names. */
export type DemoAccountIds = { bank: string; fund: string; loan: string }

/** The day the salary stops in `base`, at the age of 60, and in `retire-early`, at 50. */
export const BASE_SALARY_END = "2050-05-14"
export const RETIRE_EARLY_SALARY_END = "2040-05-14"

const FUND_END = "2050-06-30"
const SCHOOL_START = "2033-09-30"

/** The six ongoing Flows of `base`: the salary, the household's spending, the car loan and the monthly saving. */
export function demoBaseFlows(ids: DemoAccountIds): Record<string, unknown>[] {
	return [
		{
			id: "salary",
			displayLabel: "Salary",
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
			displayLabel: "Rent",
			kind: "expense",
			category: "housing",
			frequency: "monthly",
			start: "2026-11-01",
			amount: 1400000,
			growth: "inflation",
		},
		{
			id: "living",
			displayLabel: "Living costs",
			kind: "expense",
			category: "food",
			frequency: "monthly",
			start: "2026-11-01",
			amount: 2800000,
			growth: "inflation",
		},
		{
			id: "school",
			displayLabel: "School",
			kind: "expense",
			category: "education",
			frequency: "monthly",
			start: SCHOOL_START,
			amount: 800000,
			growth: "inflation",
		},
		{
			// The car loan: the 184000.00 the ledger owes at the Baseline (2026-10-31), repaid in 23 equal monthly
			// payments from November 2026 (cli ADR 0059). Amounts are minor units (satang) in this document.
			id: "car",
			displayLabel: "Car loan payment",
			kind: "contribution",
			target: ids.loan,
			frequency: "monthly",
			start: "2026-11-01",
			level: { principal: 18400000, payments: 23, rounding: "halfUp" },
		},
		{
			id: "fund",
			displayLabel: "Monthly saving",
			kind: "contribution",
			target: ids.fund,
			frequency: "monthly",
			start: "2026-11-01",
			end: FUND_END,
			amount: 1500000,
			growth: "inflation",
		},
	]
}
