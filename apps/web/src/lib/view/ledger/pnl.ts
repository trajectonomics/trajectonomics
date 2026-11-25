import type { AmountRow, Pnl } from "../../contract"
import { formatDate } from "../../format"
import { type AccountNames, NO_NAMES, refLabel } from "../account-names"

/** One P&L row: an income or expense account with the CLI's amount, sign unchanged. */
export interface PnlLine {
	readonly key: string
	readonly account: string
	readonly currency: string
	readonly amount: string
}

/** The profit and loss page's view: its period, its income and expense rows, and the CLI's totals. */
export interface PnlView {
	/** The period as the heading reads it, such as "1 Jan 2026 to 31 Oct 2026". */
	readonly period: string
	readonly project: string | null
	readonly income: readonly PnlLine[]
	readonly expense: readonly PnlLine[]
	readonly totals: readonly { readonly currency: string; readonly amount: string }[]
	/** Set when the total is not stated because the rows' sum is out of range; the rows are still stated. */
	readonly note: string | null
}

/** The P&L report as the page shows it: income rows first, then expense rows, then the totals. */
export function pnlView(report: Pnl, names: AccountNames = NO_NAMES): PnlView {
	return {
		period: periodOf(report.since, report.until),
		project: report.project,
		income: linesOf(report.rows, "income", names),
		expense: linesOf(report.rows, "expense", names),
		totals: (report.totals ?? []).map((total) => ({ ...total })),
		note: unavailableTotalNote(report),
	}
}

/** The plain statement that no total is stated because the rows' sum is out of range, or null when one is. */
export function unavailableTotalNote(report: Pnl): string | null {
	if (report.totals !== null) return null
	return "The total is not stated: every account is in range, but their sum exceeds the safe integer range. Each account's amount is shown above."
}

/** The period of a report. A report with no start date runs from the start of the ledger. */
export function periodOf(since: string | null, until: string): string {
	const start = since === null ? "the start of the ledger" : formatDate(since)
	return `${start} to ${formatDate(until)}`
}

function linesOf(
	rows: readonly AmountRow[],
	type: AmountRow["type"],
	names: AccountNames,
): PnlLine[] {
	return rows
		.filter((row) => row.type === type)
		.map((row, index) => ({
			key: `${type}:${index}`,
			account: refLabel(names, row.account),
			currency: row.currency,
			amount: row.amount,
		}))
}
