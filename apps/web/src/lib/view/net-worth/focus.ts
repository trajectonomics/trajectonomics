import type { CurrencyTotal } from "../../contract"
import { formatCompact } from "../../format"
import type { FocusHistoryPoint } from "../focus/history"
import type { HistoryView } from "./page"
import type { NetWorthView } from "./view"

/** The Net worth page's focus point: the answer in words, and the history it is written on. */
export interface NetWorthFocus {
	/** The question and the answer, for the sr-only heading: the page shows neither. */
	readonly label: string
	/** The CLI's exact string, written compact and masked by Hide amounts. */
	readonly total: string
	readonly currency: string
	/** The As-of as the read writes it, such as "31 Oct 2026", on the answer's mark. */
	readonly asOf: string
	/** Every other currency the read states, which the page shows below the focus point. */
	readonly others: readonly CurrencyTotal[]
	/** The month-end points as the line places them, each with its own month's label. */
	readonly points: readonly FocusHistoryPoint[]
	/** How many month-ends the history holds, so a failed month leaves its gap. */
	readonly months: number
}

/** Every total in words, one after another; an amount Hide amounts hides is never written. */
function totalsWords(totals: readonly CurrencyTotal[]): string {
	return totals.map((one) => `${formatCompact(one.amount)} ${one.currency}`).join(", ")
}

/**
 * The focus point of one net worth read and its history. Null when the CLI states no total (an accounts sum
 * out of the safe range), which is the page's own note rather than an answer. Every figure is the CLI's.
 */
export function netWorthFocusView(
	data: NetWorthView,
	history: HistoryView,
	hidden: boolean,
): NetWorthFocus | null {
	const total = data.totals[0]
	if (total === undefined) return null
	const points = history.series.points.map((point) => ({
		x: point.x,
		y: point.y,
		label: point.xLabel,
	}))
	const months = Math.max(history.rows.length, ...points.map((point) => point.x + 1), 1)
	const label = hidden
		? `What are you worth today? The amount is hidden. As of ${data.asOf}.`
		: `What are you worth today? ${totalsWords(data.totals)} as of ${data.asOf}.`
	return {
		label,
		total: total.amount,
		currency: total.currency,
		asOf: data.asOf,
		others: data.totals.slice(1),
		points,
		months,
	}
}
