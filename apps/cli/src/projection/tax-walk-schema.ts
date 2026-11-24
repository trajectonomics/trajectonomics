import { z } from "zod"
import { moneyField } from "./money"

/** One progressive bracket of a tax year: its edges, its rate, and what fell inside it. */
export type TaxBracketView = {
	from: string
	upTo: string | null
	rateBps: number
	income: string
	tax: string
}

/** The walk from a tax year's income to its taxable income, in the Levy's own Measures. */
export type TaxWalkView = {
	assessable: string
	expenses: string
	allowances: string
	taxableIncome: string
}

/** The fields a Thai Levy the CLI emitted adds to a tax year; a hand-written Levy gets none (ADR-0036). */
export type TaxWalkFields = {
	walk?: TaxWalkView | undefined
	brackets?: TaxBracketView[] | undefined
	marginalRateBps?: number | undefined
	toNextBracket?: string | undefined
	effectiveRateBps?: number | undefined
}

const bracketView: z.ZodType<TaxBracketView> = z.strictObject({
	from: moneyField("The bracket's lower edge: taxable income above it is taxed at this rate"),
	upTo: moneyField("The bracket's upper edge, or null for the top bracket").nullable(),
	rateBps: z.number().int().describe("The bracket's rate in basis points (500 is 5%)."),
	income: moneyField("The part of the taxable income inside this bracket"),
	tax: moneyField("The tax that part gives"),
})

const walkView: z.ZodType<TaxWalkView> = z.strictObject({
	assessable: moneyField("The assessable income, before expenses and allowances"),
	expenses: moneyField("The expenses deducted from the assessable income"),
	allowances: moneyField("The allowances deducted after the expenses"),
	taxableIncome: moneyField(
		"The net taxable income the brackets apply to: assessable income less expenses and allowances, never below 0",
	),
})

/** The schema of {@link TaxWalkFields}, spread into a tax year's own object. */
export const taxWalkShape: { [K in keyof TaxWalkFields]-?: z.ZodType<TaxWalkFields[K]> } = {
	walk: walkView
		.describe(
			"How the taxable income is reached: assessable income, less expenses, less allowances. Absent when the Levy is not one the CLI emitted.",
		)
		.optional(),
	brackets: z
		.array(bracketView)
		.describe(
			"Every progressive bracket of the tax year, lowest first, with the part of the taxable income inside it and its tax; the slices sum to taxableIncome and the taxes to progressiveTax. When the minimum tax is the one charged they still describe the progressive tax. Absent when the Levy is not one the CLI emitted.",
		)
		.optional(),
	marginalRateBps: z
		.number()
		.int()
		.describe(
			"The rate, in basis points, of the bracket the last baht of taxableIncome falls in; 0 below the first taxed bracket. An income exactly on a bracket's upper edge is still in that bracket (toNextBracket is then 0).",
		)
		.optional(),
	toNextBracket: moneyField(
		"The taxable income left before the next bracket starts; absent in the top bracket",
	).optional(),
	effectiveRateBps: z
		.number()
		.int()
		.describe(
			"The tax due as basis points of the assessable income, rounded down (due x 10000 / assessable); absent when the assessable income is 0.",
		)
		.optional(),
}
