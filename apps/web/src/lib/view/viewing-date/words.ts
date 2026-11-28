/**
 * The viewing date's words (web ADR 0033): how far a month is from the As-of, and the sentence a page shows when
 * the month falls outside the period a figure states.
 */
import { formatDate, formatMonth, yearOf } from "../../format"

/** Which side of a period a month falls on, as `periodFor` and `ruleYearFor` state it. */
export type Side = "in" | "before" | "after" | "ranOut"

/** The period a month is read against: a roll-up or tax year's range, or a Rule year's own date. */
export type SidePeriod = { readonly from: string; readonly to: string } | { readonly date: string }

/** How far a month is from the As-of month in words: "today", "in 3 months", "2 years ago". Years at each twelfth month. */
export function offsetWords(offset: number): string {
	if (offset === 0) return "today"
	const years = offset % 12 === 0
	const size = Math.abs(offset)
	const count = years ? size / 12 : size
	const unit = years ? "year" : "month"
	const amount = count === 1 ? `1 ${unit}` : `${count} ${unit}s`
	return offset > 0 ? `in ${amount}` : `${amount} ago`
}

/**
 * One sentence for a month on the wrong side of a period, or null when it is inside it. The page chooses the shape
 * of `period`: Cash flow a roll-up, Tax a tax year, Rule a Rule year's row. `end` is where the plan ends, the
 * run-out date when it runs out and the horizon otherwise.
 */
export function sideSentence(
	page: "cashflow" | "tax" | "rule",
	side: Side,
	month: string,
	period: SidePeriod,
	end: string,
): string | null {
	if (side === "in") return null
	if (side === "before") return beforeSentence(page, month, period)
	const date = formatDate(end)
	return side === "ranOut"
		? `The plan runs out on ${date}, so this is its last year.`
		: `The plan ends on ${date}, so this is its last year.`
}

/** The sentence of a month that ends before the first period the page states. */
function beforeSentence(
	page: "cashflow" | "tax" | "rule",
	month: string,
	period: SidePeriod,
): string {
	if (page === "cashflow") {
		return `${formatMonth(month)} is before the plan starts, so this is its first year.`
	}
	if (page === "tax") {
		const year = yearOf("from" in period ? period.from : period.date)
		return `Tax is projected from ${year}, so this is ${year}.`
	}
	return `The rule starts in ${formatMonth("date" in period ? period.date : period.from)}, so this is its first year.`
}

/** The Cash flow sentence for a month inside a roll-up: "Mar 2031 is in the year from 31 Oct 2030 to 30 Oct 2031." */
export function rollupSentence(month: string, from: string, to: string): string {
	return `${formatMonth(month)} is in the year from ${formatDate(from)} to ${formatDate(to)}.`
}
