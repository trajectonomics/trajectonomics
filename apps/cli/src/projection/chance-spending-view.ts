import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The spending half of `projection chance`'s result (cli ADR-0063): what a plan's spending rules paid
 * across Market paths, and the lowest year they paid in. The engine decides every figure (sim ADR-0024);
 * these are the names a person, an agent and the Dashboard read. A plan with no rule Flow has none of it.
 */

/** One Percentile across Market paths: its level and its money string. */
export type ChancePercentileView = { level: number; value: string }

/** The spending Percentiles across Market paths at one annual roll-up end. */
export type ChanceSpendingBandView = { index: number; to: string; spending: ChancePercentileView[] }

/**
 * The Percentiles of each path's lowest year of spending: `paths` is how many paths have one, and
 * `spending` is empty when none does.
 */
export type ChanceLowestYearView = { paths: number; spending: ChancePercentileView[] }

/** The Bands at the roll-ups a person reads, at the 10th, 50th and 90th Percentiles. */
export type ChanceTableRow = {
	index: number
	to: string
	p10: string
	p50: string
	/** Present only for the nominal Bands of a model with an inflation factor. */
	p50Real?: string | undefined
	p90: string
}

/** The lowest-year Percentiles as one row, with the number of paths they are over. */
export type ChanceLowestYearRow = {
	paths: number
	p10: string
	p25: string
	p50: string
	p75: string
	p90: string
}

/** The spending Bands table the human form adds for a plan with a spending rule. */
export type ChanceSpendingBandsTable = {
	name: "spendingBands"
	count: number
	rows: ChanceTableRow[]
}

/** The lowest-year table the human form adds for a plan with a spending rule. */
export type ChanceLowestYearTable = {
	name: "lowestYearSpending"
	count: number
	rows: ChanceLowestYearRow[]
}

/** The two tables the human form adds for a plan with a spending rule. */
export type ChanceSpendingTable = ChanceSpendingBandsTable | ChanceLowestYearTable

/** One Percentile of a spending figure, at a level of the engine's fixed set. */
function percentile(what: string): z.ZodType<ChancePercentileView> {
	return z.strictObject({
		level: z
			.number()
			.int()
			.describe("The Percentile, from the engine's fixed set: 10, 25, 50, 75, 90."),
		value: moneyField(what),
	})
}

const spendingBand: z.ZodType<ChanceSpendingBandView> = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	to: dateField("The roll-up's last day"),
	spending: z
		.array(percentile("What the rule Flows paid in the roll-up"))
		.describe(
			"The Percentiles of what the plan's spending rules paid in the roll-up, in level order. A path that ran out pays 0 after it ran out. A roll-up a rule starts or ends part-way through holds less than a year.",
		),
})

export const spendingBandField: z.ZodOptional<z.ZodType<ChanceSpendingBandView[]>> = z
	.array(spendingBand)
	.optional()
	.describe(
		"What the plan's spending rules paid across Market paths, one Band per annual roll-up end, in order. Present only when the Scenario has a rule Flow (cli ADR-0063).",
	)

const lowestYear: z.ZodType<ChanceLowestYearView> = z.strictObject({
	paths: z
		.number()
		.int()
		.describe(
			"How many Market paths have a lowest year: every path that ran out, and each other path with a roll-up holding a whole year of the rule.",
		),
	spending: z
		.array(percentile("A path's lowest year of spending"))
		.describe(
			"The Percentiles, across those paths, of each path's lowest whole year of spending, in level order. The 10th is 0 whenever at least a tenth of the paths ran out. Empty when no path has one.",
		),
})

export const lowestYearField: z.ZodOptional<z.ZodType<ChanceLowestYearView>> = lowestYear
	.optional()
	.describe(
		"How little the plan's spending rules pay in a bad year, across Market paths. Present only when the Scenario has a rule Flow (cli ADR-0063).",
	)
