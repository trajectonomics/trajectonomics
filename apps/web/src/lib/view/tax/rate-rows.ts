import type { TaxYear } from "../../contract"
import { rateWords } from "./rate-words"
import { periodOf } from "./tax-rows"

/** One tax year in the table of how its income was taxed: the figures the CLI stated, and null for one it did not. */
export interface RateRow {
	readonly key: string
	readonly period: string
	readonly assessable: string | null
	readonly taxable: string | null
	readonly tax: string
	readonly topRate: string | null
	readonly shareOfIncome: string | null
}

/**
 * One row per tax year, or none when the CLI stated no walk or rate for any of them (a hand-written Levy), so the
 * page adds no table to a plan it knows nothing more about.
 */
export function rateRows(years: readonly TaxYear[]): readonly RateRow[] {
	if (!years.some((year) => year.walk !== undefined || year.marginalRateBps !== undefined))
		return []
	return years.map((year) => ({
		key: `${year.levy}-${year.from}`,
		period: periodOf(year),
		assessable: year.walk?.assessable ?? null,
		taxable: year.walk?.taxableIncome ?? year.taxableIncome ?? null,
		tax: year.due,
		topRate: year.marginalRateBps === undefined ? null : rateWords(year.marginalRateBps),
		shareOfIncome: year.effectiveRateBps === undefined ? null : rateWords(year.effectiveRateBps),
	}))
}
