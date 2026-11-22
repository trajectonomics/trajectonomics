import type { MonthlyRow } from "./fixtures.test-support"

/** The monthly rows of the fixture, each with the ages on its date (empty without a household). */
export const MONTHLY_ROWS: readonly MonthlyRow[] = [
	{
		date: "2026-10-31",
		ages: [],
		netWorth: "1250000.00",
		realNetWorth: "1250000.00",
		accessibleNetWorth: "900000.00",
		realAccessibleNetWorth: "900000.00",
	},
	{
		date: "2026-11-30",
		ages: [],
		netWorth: "1262000.00",
		realNetWorth: "1255000.00",
		accessibleNetWorth: "910000.00",
		realAccessibleNetWorth: "905000.00",
	},
]
