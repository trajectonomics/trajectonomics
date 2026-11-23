/**
 * A loan's statement as the planner shows it: the rows `traj projection run --liabilities` prints for its
 * Account (cli ADR 0059), grouped by year, and its paid-off date. Every figure is the CLI's text. The page
 * adds no sum and no interest: a year's rows are shown as they are, and the payment is the first month's
 * `paid` that is not zero.
 */
import type { ProjectionRun } from "../../contract"

/** One month of a loan: what it owed at the start, what was borrowed and paid, the interest, and what it owed at the end. */
export interface ScheduleRow {
	readonly month: string
	readonly opening: string
	readonly drawn: string
	readonly interest: string
	readonly paid: string
	readonly closing: string
}

/** The months of one calendar year, in date order. */
export interface ScheduleYear {
	readonly year: string
	readonly rows: readonly ScheduleRow[]
}

/** A loan's statement: its payment, its paid-off date or what it owes at the end, and its schedule. */
export interface LoanStatement {
	/** The first month's payment the CLI reports (the first `paid` that is not zero), or null when none. */
	readonly payment: string | null
	/** The date the loan is paid off, or null when it is not paid off by the end of the Projection. */
	readonly paidOff: string | null
	/** What the loan still owes at the end, and the month it does so, when it is not paid off. */
	readonly owing: { readonly amount: string; readonly date: string } | null
	readonly years: readonly ScheduleYear[]
}

/** A decimal string that is zero: "0.00", "0" or "0.0", as the CLI prints a month with no payment. */
function isZero(amount: string): boolean {
	return /^0(\.0+)?$/.test(amount)
}

/** The statement of the loan of one Account, from a Projection run that asked for `--liabilities`. */
export function statementOf(run: ProjectionRun | undefined, account: string): LoanStatement {
	const tables = run?.tables ?? []
	const rows = tables
		.flatMap((table) => (table.name === "liabilities" ? table.rows : []))
		.filter((row) => row.account === account)
	const paidOffDates = tables.flatMap((table) =>
		table.name === "paidOff" ? table.rows.filter((row) => row.account === account) : [],
	)
	const paidOff = paidOffDates[0]?.date ?? null
	const last = rows[rows.length - 1]
	const firstPaid = rows.find((row) => !isZero(row.paid))
	return {
		payment: firstPaid?.paid ?? null,
		paidOff,
		owing: paidOff === null && last !== undefined ? { amount: last.closing, date: last.to } : null,
		years: yearsOf(rows),
	}
}

/** One row of the `liabilities` table, as the contract decodes it. */
type LiabilityRow = Extract<
	ProjectionRun["tables"][number],
	{ name: "liabilities" }
>["rows"][number]

/** The months of a statement, grouped by the year each month starts in. */
function yearsOf(rows: readonly LiabilityRow[]): ScheduleYear[] {
	const years = new Map<string, ScheduleRow[]>()
	for (const row of rows) {
		const year = row.from.slice(0, 4)
		const month: ScheduleRow = {
			month: row.from.slice(0, 7),
			opening: row.opening,
			drawn: row.drawn,
			interest: row.interest,
			paid: row.paid,
			closing: row.closing,
		}
		years.set(year, [...(years.get(year) ?? []), month])
	}
	return [...years].map(([year, months]) => ({ year, rows: months }))
}
