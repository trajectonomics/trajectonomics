import type { ProjectionRun } from "../../contract"
import { ANNUAL_ROWS, projectionRunFixture } from "../projection/fixtures.test-support"
import type { CashflowTotal } from "./cashflow"
import { YEAR_ONE_LINES, YEAR_ZERO_LINES } from "./fixture-lines.test-support"

/** One section total of a roll-up, with its span, as the CLI prints it. */
function totalRow(
	index: number,
	span: { from: string; to: string },
	total: CashflowTotal["total"],
	amount: string,
): CashflowTotal {
	return { index, from: span.from, to: span.to, total, amount }
}

const YEAR_ZERO = { from: "2026-10-31", to: "2027-10-30" }

/** Year zero's section totals, as the CLI states them: money in, tax, and the rest, in the CLI's order. */
const YEAR_ZERO_TOTALS: CashflowTotal[] = [
	totalRow(0, YEAR_ZERO, "money in", "124500.00"),
	totalRow(0, YEAR_ZERO, "tax", "4200.00"),
	totalRow(0, YEAR_ZERO, "withdrawals", "3000.00"),
	totalRow(0, YEAR_ZERO, "drawn", "1500.00"),
	totalRow(0, YEAR_ZERO, "spending", "50700.00"),
	totalRow(0, YEAR_ZERO, "saving", "64800.00"),
	totalRow(0, YEAR_ZERO, "not funded", "19200.00"),
	totalRow(0, YEAR_ZERO, "left over", "4800.00"),
	totalRow(0, YEAR_ZERO, "unmet", "0.00"),
]

const YEAR_ONE = { from: "2027-10-31", to: "2028-10-30" }

const YEAR_ONE_TOTALS: CashflowTotal[] = [
	totalRow(1, YEAR_ONE, "money in", "1000.00"),
	totalRow(1, YEAR_ONE, "tax", "0.00"),
	totalRow(1, YEAR_ONE, "spending", "1500.00"),
	totalRow(1, YEAR_ONE, "saving", "0.00"),
	totalRow(1, YEAR_ONE, "left over", "0.00"),
	totalRow(1, YEAR_ONE, "unmet", "500.00"),
]

/** A run with the annual table and the cash flow tables of two roll-ups: a normal year, then a Shortfall year. */
export function cashflowRunFixture(patch: Partial<ProjectionRun> = {}): ProjectionRun {
	return projectionRunFixture({
		tables: [
			{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] },
			{
				name: "cashflow",
				count: YEAR_ZERO_LINES.length + YEAR_ONE_LINES.length,
				rows: [...YEAR_ZERO_LINES, ...YEAR_ONE_LINES],
			},
			{
				name: "cashflowTotals",
				count: YEAR_ZERO_TOTALS.length + YEAR_ONE_TOTALS.length,
				rows: [...YEAR_ZERO_TOTALS, ...YEAR_ONE_TOTALS],
			},
		],
		...patch,
	})
}
