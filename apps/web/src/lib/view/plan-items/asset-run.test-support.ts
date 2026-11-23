import type { ProjectionRun } from "../../contract"
import { ANNUAL_ROWS, projectionRunFixture } from "../projection/fixtures.test-support"

type Table = ProjectionRun["tables"][number]

const SPAN = { from: "2026-10-31", to: "2027-10-30" }

function line(id: string, group: "expense" | "income" | "unfunded", amount: string) {
	return { index: 0, ...SPAN, group, id, account: null, category: null, amount }
}

/** A run the way `--accounts --breakdown --liabilities` states a home bought on 2027-07-15 and sold on 2028-07-15. */
export function homeRun(patch: Partial<ProjectionRun> = {}): ProjectionRun {
	const balance = (date: string, account: string, amount: string, real: string) => ({
		date,
		account,
		amount,
		real,
	})
	const tables: Table[] = [
		{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] },
		{
			name: "cashflow",
			count: 3,
			rows: [
				line("home-running", "expense", "3768.78"),
				line("home-rent", "income", "1884.39"),
				line("fund", "unfunded", "100.00"),
			],
		},
		{
			name: "balances",
			count: 5,
			rows: [
				balance("2027-10-31", "home", "1513176.79", "1469103.68"),
				balance("2027-10-31", "home-loan", "1189027.43", "1154395.56"),
				balance("2028-10-31", "home", "0.00", "0.00"),
				balance("2028-10-31", "home-loan", "0.00", "0.00"),
				balance("2028-12-31", "home", "0.00", "0.00"),
			],
		},
		{ name: "paidOff", count: 1, rows: [{ account: "home-loan", date: "2028-07-15" }] },
	]
	return projectionRunFixture({ tables, ...patch })
}
