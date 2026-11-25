import { toChartNumber } from "../../chart/number"
import type { AmountRow, CurrencyTotal, Pnl } from "../../contract"
import { formatDate } from "../../format"
import { unavailableTotalNote } from "../ledger/pnl"

/** The profit and loss card: the period, the CLI's totals, and its three largest rows. */
export interface PnlView {
	readonly period: string
	readonly totals: readonly CurrencyTotal[]
	readonly largest: readonly AmountRow[]
	readonly hasRows: boolean
	/** Set when the total is not stated because the rows' sum is out of range; the rows are still stated. */
	readonly note: string | null
}

/** The P&L card's reading of one `report pnl` Read. */
export function pnlView(data: Pnl): PnlView {
	return {
		period: periodOf(data),
		totals: data.totals ?? [],
		note: unavailableTotalNote(data),
		largest: largestRows(data.rows, 3),
		hasRows: data.rows.length > 0,
	}
}

function periodOf(data: Pnl): string {
	const until = formatDate(data.until)
	return data.since === null ? `Up to ${until}` : `${formatDate(data.since)} to ${until}`
}

/**
 * The rows of greatest size, largest first. Size orders the rows only: a row's amount is shown as
 * the CLI states it. Rows of equal size keep the CLI's own order, since the sort is stable.
 */
export function largestRows(rows: readonly AmountRow[], count: number): AmountRow[] {
	return rows
		.map((row) => ({ row, size: Math.abs(toChartNumber(row.amount)) }))
		.sort((a, b) => b.size - a.size)
		.slice(0, count)
		.map((entry) => entry.row)
}
