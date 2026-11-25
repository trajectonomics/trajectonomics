import type { TaxYear } from "../../contract"
import { type BracketBar, bracketBars } from "./bracket-bars"
import { rateWords } from "./rate-words"
import { periodOf } from "./tax-rows"

/** One line of the walk from assessable income to taxable income. */
export interface WalkLine {
	readonly key: string
	readonly label: string
	readonly amount: string
	/** True for a line taken off the one above it, which the page says in words. */
	readonly less: boolean
}

/** The current tax year as the page explains it: where its income was taxed and at what rates. */
export interface CurrentYear {
	readonly levy: string
	readonly period: string
	/** The CLI's own notes for this year, such as the minimum tax applying; shown above the brackets. */
	readonly notes: readonly string[]
	readonly walk: readonly WalkLine[] | null
	readonly bars: readonly BracketBar[] | null
	/** The taxable income that fits in the top bracket's rate before the next one; absent in the highest bracket. */
	readonly toNextBracket: string | null
	readonly topRate: string | null
	readonly shareOfIncome: string | null
}

/**
 * The tax year the As-of falls in, or else the first one that starts after it. Dates are compared as the
 * CLI wrote them; nothing is worked out.
 */
export function pickCurrent(years: readonly TaxYear[], asOf: string): TaxYear | null {
	return (
		years.find((year) => year.from <= asOf && asOf <= year.to) ??
		years.find((year) => year.from > asOf) ??
		null
	)
}

/** Whether the CLI stated anything about how the year's tax was reached. A hand-written Levy states none. */
export function hasWalk(year: TaxYear): boolean {
	return (
		year.walk !== undefined ||
		year.brackets !== undefined ||
		year.marginalRateBps !== undefined ||
		year.effectiveRateBps !== undefined
	)
}

function walkLines(year: TaxYear): readonly WalkLine[] | null {
	const walk = year.walk
	if (!walk) return null
	return [
		{ key: "assessable", label: "Assessable income", amount: walk.assessable, less: false },
		{ key: "expenses", label: "Expenses", amount: walk.expenses, less: true },
		{ key: "allowances", label: "Allowances", amount: walk.allowances, less: true },
		{ key: "taxable", label: "Taxable income", amount: walk.taxableIncome, less: false },
	]
}

/** The current year for the page, or null when there is none or the CLI stated nothing about it (a hand-written Levy). */
export function currentYear(years: readonly TaxYear[], asOf: string): CurrentYear | null {
	const year = pickCurrent(years, asOf)
	if (year === null || !hasWalk(year)) return null
	return {
		levy: year.levy,
		period: periodOf(year),
		notes: year.notes ?? [],
		walk: walkLines(year),
		bars: year.brackets ? bracketBars(year.brackets) : null,
		toNextBracket: year.toNextBracket ?? null,
		topRate: year.marginalRateBps === undefined ? null : rateWords(year.marginalRateBps),
		shareOfIncome: year.effectiveRateBps === undefined ? null : rateWords(year.effectiveRateBps),
	}
}
