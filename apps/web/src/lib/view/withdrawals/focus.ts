import { barHeights, toChartNumber } from "../../chart"
import { formatCompact, formatMonth, trimPercent } from "../../format"
import type { Terms } from "../projection/terms"
import type { WithdrawalsView } from "./view"

/** The Withdrawals page's focus point: the amount the first rule pays, and every year of it as a column. */
export interface WithdrawalsFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	/** The first Rule year's amount, under the terms the page shows. */
	readonly amount: string
	readonly currency: string
	/** The first Rule year's month, as a small tick under the columns: "Jan 2027". */
	readonly first: string
	/** The withdrawal rate the CLI states for the first year, trimmed: "3.99%", or "" when it states none. */
	readonly share: string
	/** Each column's height as a percent of the tallest, for drawing only. */
	readonly heights: readonly number[]
}

/**
 * The focus point of the first spending rule's years. Null when the plan has no rule years, which is the
 * page's own empty state. The first column carries the answer; the heights are the CLI's amounts placed for
 * drawing only (web ADR 0002).
 */
export function withdrawalsFocusView(
	view: WithdrawalsView,
	terms: Terms,
	hidden: boolean,
): WithdrawalsFocus | null {
	const rule = view.rules[0]
	const firstRow = rule?.rows[0]
	if (rule === undefined || firstRow === undefined) return null
	const real = terms === "real"
	const amount = real ? firstRow.realAmount : firstRow.amount
	const values = rule.rows.map((row) => toChartNumber(real ? row.realAmount : row.amount))
	const first = formatMonth(firstRow.date)
	const share = firstRow.share === null ? "" : trimPercent(firstRow.share)
	const savings = share === "" ? "" : `, ${share} of your savings`
	const tone = real ? ", in today's money" : ""
	const amountWords = hidden
		? view.rules.length > 1
			? "The first rule's amount is hidden."
			: "The amount is hidden."
		: `${formatCompact(amount)} ${view.currency}.`
	return {
		label: `What could you spend in retirement? ${amountWords} From ${first}${savings}${tone}.`,
		amount,
		currency: view.currency,
		first,
		share,
		heights: barHeights(values, 100),
	}
}
