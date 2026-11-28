import type { ReportingCashflow } from "@trajectonomics/core/sim"
import { linesOf } from "./cashflow"
import type { LineFigures } from "./cashflow-totals"
import { moneyOf } from "./money"
import type { ReportingLine } from "./reporting-view"

/*
 * The two readers the Reporting year and month tables share (cli ADR-0086): a span's engine lines in
 * the long-table shape, and the same lines as the totals read them. Every line is the engine's, through
 * `linesOf`; nothing here reads a roll-up field, because a Reporting span has none.
 */

/** A span's lines in the long-table shape, with each amount at the Currency's scale. */
export function linesOfSpan(span: ReportingCashflow, currency: string): ReportingLine[] {
	const money = moneyOf(currency)
	return linesOf(span).map(({ minor, id, account, category, group, entry }) => ({
		group,
		id,
		account,
		category,
		amount: money(minor),
		...(entry === undefined ? {} : { entry }),
	}))
}

/** A span's lines as the totals read them; the amount is the decimal string, so the sum stays exact. */
export function figuresOfSpan(span: ReportingCashflow, currency: string): LineFigures[] {
	return linesOfSpan(span, currency).map(({ group, amount }) => ({ group, amount }))
}

/** A Reporting month's key: the first seven characters of `from`, as `YYYY-MM`. */
export function monthOfSpan(span: ReportingCashflow): string {
	return span.from.slice(0, 7)
}
