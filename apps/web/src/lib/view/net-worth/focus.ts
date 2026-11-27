import { formatCompact } from "../../format"
import type { HistoryView } from "./page"
import type { NetWorthView } from "./view"

/** The Net worth page's focus point: the answer in words, and the history it is written on. */
export interface NetWorthFocus {
	/** The question and the answer, for the sr-only heading: the page shows neither. */
	readonly label: string
	/** The CLI's exact string, written compact and masked by Hide amounts. */
	readonly total: string
	readonly currency: string
	/** The month-end totals as chart numbers, oldest first, for the line's positions only. */
	readonly values: readonly number[]
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
	const label = hidden
		? `What are you worth today? The amount is hidden. As of ${data.asOf}.`
		: `What are you worth today? ${formatCompact(total.amount)} ${total.currency} as of ${data.asOf}.`
	return {
		label,
		total: total.amount,
		currency: total.currency,
		values: history.series.points.map((point) => point.y),
	}
}
