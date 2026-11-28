import { shares, toChartNumber } from "../../chart"
import { formatCompact, yearOf } from "../../format"
import { isZeroAmount } from "../compare/cell"
import type { Rollup } from "./cashflow"

/** The uses the focus bar draws, in the order a person reads them. */
const USES = ["tax", "spending", "saving", "left over"] as const

/** The width, in px, of the narrowest bar a name under it has to fit: a phone's visual. */
const NARROW_BAR = 300

/** About one character of a `text-xs` name, in px. */
const CHARACTER = 6.5

/** One use of the year as the focus bar draws it. */
export interface CashflowFocusSegment {
	readonly key: string
	readonly name: string
	/** The segment's share of the bar, from 0 to 1, placed for drawing only (web ADR 0002). */
	readonly share: number
	/** True for the one segment the answer is: what is left over. */
	readonly accent: boolean
	/** The name under the segment, or null when it would be wider than the segment at a phone. */
	readonly label: string | null
}

/** The Cash flow page's focus point: where a year's money went, as one bar, and what is left. */
export interface CashflowFocus {
	/** The question and the answer, for the sr-only heading: the page writes the answer on the bar instead. */
	readonly label: string
	readonly currency: string
	/** The year the roll-up starts in, such as "2026", for the question. */
	readonly year: string
	/** The CLI's money in, shown compact at the bar's left. */
	readonly moneyIn: string
	/** The CLI's answer: what is left over, or the unmet amount when the year is short. */
	readonly answer: string
	readonly short: boolean
	/** The uses, in the CLI's names, each with its width. Empty when the year is short. */
	readonly segments: readonly CashflowFocusSegment[]
	/** The short year's bar: money in against the unmet part, as shares of their sum. */
	readonly shortBar: { readonly moneyIn: number; readonly unmet: number } | null
	/** True when every use is zero, so the picture draws a thin baseline rather than nothing. */
	readonly emptyBar: boolean
}

/** The name under a segment, or null when the segment is narrower than the name would be on a phone. */
function labelOf(name: string, share: number): string | null {
	return share * NARROW_BAR >= name.length * CHARACTER ? name : null
}

/** One total of the roll-up by the CLI's name for it, or null when the year states no such row. */
function amountOf(rollup: Rollup, total: string): string | null {
	return rollup.totals.find((row) => row.total === total)?.amount ?? null
}

/** The heading: the amount and its mark, then where the money came from. Hide amounts hides both figures, never the mark. */
function labelOfFocus(
	year: string,
	answer: string,
	moneyIn: string,
	currency: string,
	short: boolean,
	hidden: boolean,
): string {
	const question = `Where does your money go in ${year}?`
	const mark = short ? "short" : "left over"
	if (hidden) {
		return `${question} The amount is hidden, and it is ${mark}. From an amount that is hidden coming in.`
	}
	return `${question} ${formatCompact(answer)} ${currency} ${mark}. From ${formatCompact(moneyIn)} ${currency} coming in.`
}

/** The year's four uses in the CLI's names, or null when it states no total for one of them. */
function usesOf(rollup: Rollup): { readonly name: string; readonly amount: string }[] | null {
	const uses: { readonly name: string; readonly amount: string }[] = []
	for (const name of USES) {
		const amount = amountOf(rollup, name)
		if (amount === null) return null
		uses.push({ name, amount })
	}
	return uses
}

/**
 * The focus point of one Annual roll-up. Null when the year states no money in, unmet or use total, which is
 * the page's own empty state rather than an answer. Every figure is the CLI's string; the bar's widths are
 * those strings placed for drawing only (web ADR 0002).
 */
export function cashflowFocusView(
	rollup: Rollup | null,
	currency: string,
	hidden: boolean,
): CashflowFocus | null {
	if (rollup === null) return null
	const moneyIn = amountOf(rollup, "money in")
	const unmet = amountOf(rollup, "unmet")
	const uses = usesOf(rollup)
	if (moneyIn === null || uses === null) return null
	const year = yearOf(rollup.from)
	const shortAmount = unmet !== null && !isZeroAmount(unmet) ? unmet : null
	const leftOver = uses.at(-1)?.amount
	if (leftOver === undefined) return null
	const answer = shortAmount ?? leftOver
	const widths = shares(uses.map((use) => Math.max(0, toChartNumber(use.amount))))
	const segments = uses.map((use, index) => ({
		key: use.name,
		name: use.name,
		share: widths[index] ?? 0,
		accent: use.name === "left over",
		label: labelOf(use.name, widths[index] ?? 0),
	}))
	return {
		label: labelOfFocus(year, answer, moneyIn, currency, shortAmount !== null, hidden),
		currency,
		year,
		moneyIn,
		answer,
		short: shortAmount !== null,
		segments: shortAmount === null ? segments : [],
		shortBar: shortAmount === null ? null : shortBarOf(moneyIn, shortAmount),
		emptyBar: shortAmount === null && segments.every((segment) => segment.share === 0),
	}
}

/** The short year's two parts: the money that came in, then the part it fell short by. */
function shortBarOf(
	moneyIn: string,
	unmet: string,
): { readonly moneyIn: number; readonly unmet: number } | null {
	const came = Math.max(0, toChartNumber(moneyIn))
	const short = Math.max(0, toChartNumber(unmet))
	const total = came + short
	if (total === 0) return null
	return { moneyIn: came / total, unmet: short / total }
}
