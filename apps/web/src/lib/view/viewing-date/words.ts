/**
 * The viewing date's words (web ADR 0033): how far a month is from the As-of, the sentence a page shows when
 * the month falls outside the period a figure states, and the Net worth page's focus label.
 */
import type { CurrencyTotal, NetWorth, Read } from "../../contract"
import { formatCompact, formatDate, formatMonth, yearOf } from "../../format"
import type { MonthlyRow } from "../projection/annual"
import type { NetWorthAt, Side } from "./rows"

export type { Side }

/** The period a month is read against: a roll-up or tax year's range, or a Rule year's own date. */
export type SidePeriod = { readonly from: string; readonly to: string } | { readonly date: string }

/** A plan's name, and the currency its projection run states, which the future figure is written in. */
export interface NetWorthPlan {
	readonly name: string
	readonly currency: string
}

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

/** Every currency total in words, one after another; an amount Hide amounts hides is never written. */
function totalsWords(totals: readonly CurrencyTotal[]): string {
	return totals.map((one) => `${formatCompact(one.amount)} ${one.currency}`).join(", ")
}

/** A successful Net worth Read's label: its totals at the As-of, or the hidden figure. Null when it states no total. */
function readLabel(question: string, read: Read<NetWorth>, hidden: boolean): string | null {
	if (!read.ok) return null
	const totals = read.data.totals ?? []
	if (totals.length === 0) return null
	const asOf = formatDate(read.data.asOf)
	return hidden
		? `${question} The amount is hidden. As of ${asOf}.`
		: `${question} ${totalsWords(totals)} as of ${asOf}.`
}

/** A future month's label: the monthly row's net worth in the plan's currency, at the row's own date. */
function futureLabel(row: MonthlyRow, month: string, plan: NetWorthPlan, hidden: boolean): string {
	const when = formatMonth(month)
	const date = formatDate(row.date)
	return hidden
		? `What will you be worth at the end of ${when}? The amount is hidden. On ${date}, in the plan ${plan.name}.`
		: `What will you be worth at the end of ${when}? ${formatCompact(row.netWorth)} ${plan.currency} on ${date}, in the plan ${plan.name}.`
}

/** A month after the plan ran out: its question and the date the plan ended, with no figure. */
function ranOutLabel(date: string, month: string, plan: NetWorthPlan): string {
	return `What will you be worth in ${formatMonth(month)}? The plan ${plan.name} runs out on ${formatDate(date)}.`
}

/**
 * The Net worth page's focus label for one viewing month (web ADR 0033): the question and the figure the Read or the
 * monthly row states, so the sentence always names the month that is on screen. Null when no row states the month,
 * or the CLI states no total, and the page shows its own notice instead of an answer.
 */
export function netWorthLabel(
	at: NetWorthAt,
	month: string,
	plan: NetWorthPlan,
	hidden: boolean,
): string | null {
	switch (at.kind) {
		case "missing":
			return null
		case "ranOut":
			return ranOutLabel(at.date, month, plan)
		case "future":
			return futureLabel(at.row, month, plan, hidden)
		case "today":
			return readLabel("What are you worth today?", at.read, hidden)
		case "past": {
			const question = `What were you worth at the end of ${formatMonth(month)}?`
			return readLabel(question, at.read, hidden)
		}
	}
}
