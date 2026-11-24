/**
 * A loan's statement as the planner shows it: the rows `traj projection run --liabilities` prints for its
 * Account (cli ADR 0059), grouped by year, and its paid-off date. Every figure is the CLI's text. The page
 * adds no sum and no interest: a year's rows are shown as they are. The `liabilities` table states no payment
 * of its own, so the card says what it shows: the `paid` of the month the first payment falls in, and whether
 * an extra payment lands in that month too. The schedule runs from the first month with a draw, a payment or
 * interest to the last such month, so the empty months before and after the loan are left out.
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

/** What a statement needs of its loan's document parts: when the first payment falls, and its extra payments. */
export interface LoanTerms {
	/** The date of the first payment, as the document states it. */
	readonly firstPayment: string
	/** The extra payments into the loan: when each starts, how often it falls and, when it repeats, its last date. */
	readonly extras: readonly {
		readonly start: string
		readonly end?: string | undefined
		/** The Flow's frequency, as the document states it: the form writes `once` and `monthly`. */
		readonly frequency: string
	}[]
}

/** The `paid` of the month the first payment falls in, as the CLI states it. */
export interface PaymentMonth {
	readonly amount: string
	/** The month, as `YYYY-MM`. */
	readonly month: string
	/** True when an extra payment lands in the same month, so the CLI's `paid` holds it too. */
	readonly withExtra: boolean
}

/** A loan's statement: its payment month, its paid-off date or what it owes at the end, and its schedule. */
export interface LoanStatement {
	/** What the CLI reports as paid in the first payment's month, or null when the month is not in the rows. */
	readonly payment: PaymentMonth | null
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

/** Whether a row states anything: a draw, a payment or interest. */
function isActive(row: LiabilityRow): boolean {
	return !isZero(row.drawn) || !isZero(row.paid) || !isZero(row.interest)
}

/**
 * Whether an extra payment lands in the month (`YYYY-MM`): dates are compared as the text they are. Only the two
 * frequencies the form writes are read, `once` in its month and `monthly` in every month of its span; any other
 * frequency falls on months this does not know, so it leaves the flag off rather than say the CLI's `paid` holds it.
 */
function extraIn(month: string, terms: LoanTerms): boolean {
	return terms.extras.some((extra) => {
		const start = extra.start.slice(0, 7)
		if (extra.frequency === "once") return start === month
		if (extra.frequency !== "monthly") return false
		return start <= month && (extra.end === undefined || extra.end.slice(0, 7) >= month)
	})
}

/** The statement of the loan of one Account, from a Projection run that asked for `--liabilities`. */
export function statementOf(
	run: ProjectionRun | undefined,
	account: string,
	terms: LoanTerms,
): LoanStatement {
	const tables = run?.tables ?? []
	const all = tables
		.flatMap((table) => (table.name === "liabilities" ? table.rows : []))
		.filter((row) => row.account === account)
	const paidOffDates = tables.flatMap((table) =>
		table.name === "paidOff" ? table.rows.filter((row) => row.account === account) : [],
	)
	const paidOff = paidOffDates[0]?.date ?? null
	const first = all.findIndex(isActive)
	const last = all.findLastIndex(isActive)
	const rows = first < 0 ? [] : all.slice(first, last + 1)
	const end = all[all.length - 1]
	const month = terms.firstPayment.slice(0, 7)
	const paid = rows.find((row) => row.from.slice(0, 7) === month && !isZero(row.paid))
	return {
		payment:
			paid === undefined ? null : { amount: paid.paid, month, withExtra: extraIn(month, terms) },
		paidOff,
		owing: paidOff === null && end !== undefined ? { amount: end.closing, date: end.to } : null,
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
