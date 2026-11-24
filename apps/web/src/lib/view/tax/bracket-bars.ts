import { barHeights, toChartNumber } from "../../chart"
import type { TaxBracket } from "../../contract"
import { isAboveZero } from "../../format"
import { rateWords } from "./rate-words"

/** One bracket the income reached, as a bar: its rate, its figures and how much of the row it fills. */
export interface BracketBar {
	readonly key: string
	readonly rate: string
	readonly income: string
	readonly tax: string
	/** The bar's width as a percent of the row, for drawing only: this bracket's income against the largest one's. */
	readonly width: number
	/** True for the bracket the last baht of taxable income falls in, which the page calls "Your top rate". */
	readonly top: boolean
}

/** The index of the bracket the income ends in: the last with income in it, or the first when there is none. */
export function topIndex(brackets: readonly TaxBracket[]): number {
	return Math.max(
		0,
		brackets.findLastIndex((bracket) => isAboveZero(bracket.income)),
	)
}

/** The brackets the income reached, lowest first, each with its bar; the last one is marked as the top. */
export function bracketBars(brackets: readonly TaxBracket[]): readonly BracketBar[] {
	const top = topIndex(brackets)
	const reached = brackets.slice(0, top + 1)
	const widths = barHeights(
		reached.map((bracket) => toChartNumber(bracket.income)),
		100,
	)
	return reached.map((bracket, index) => ({
		key: `${bracket.from}-${bracket.rateBps}`,
		rate: rateWords(bracket.rateBps),
		income: bracket.income,
		tax: bracket.tax,
		width: widths[index] ?? 0,
		top: index === top,
	}))
}
