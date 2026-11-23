import { z } from "zod"
import type {
	ChanceLowestYearRow,
	ChanceLowestYearTable,
	ChanceSpendingBandsTable,
	ChanceTableRow,
} from "./chance-spending-view"
import { dateField, moneyField } from "./money"

/*
 * The two tables `projection chance` adds to its human form for a plan with a spending rule (cli
 * ADR-0063), as the output schema states them: a few spending Bands, and the one lowest-year row.
 */

const spendingRow: z.ZodType<ChanceTableRow> = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	to: dateField("The roll-up's last day"),
	p10: moneyField("Spending at the 10th Percentile"),
	p50: moneyField("Spending at the 50th Percentile"),
	p90: moneyField("Spending at the 90th Percentile"),
})

const lowestYearRow: z.ZodType<ChanceLowestYearRow> = z.strictObject({
	paths: z
		.number()
		.int()
		.describe("The paths the Percentiles are over: those with a lowest year of spending."),
	p10: moneyField("The lowest year at the 10th Percentile"),
	p25: moneyField("The lowest year at the 25th Percentile"),
	p50: moneyField("The lowest year at the 50th Percentile"),
	p75: moneyField("The lowest year at the 75th Percentile"),
	p90: moneyField("The lowest year at the 90th Percentile"),
})

/** The two tables a plan with a spending rule adds to the human form, as the output schema states them. */
export const spendingTables: readonly [
	z.ZodType<ChanceSpendingBandsTable>,
	z.ZodType<ChanceLowestYearTable>,
] = [
	z.strictObject({
		name: z
			.literal("spendingBands")
			.describe("The spending Bands the human form prints, only for a plan with a spending rule."),
		count: z.number().int().describe("The number of rows."),
		rows: z.array(spendingRow).describe("A few roll-ups, the first, every fifth and the last."),
	}),
	z.strictObject({
		name: z
			.literal("lowestYearSpending")
			.describe(
				"The lowest year of spending the human form prints, only for a plan with a spending rule.",
			),
		count: z.number().int().describe("The number of rows: one."),
		rows: z.array(lowestYearRow).describe("The one row of the lowest-year Percentiles."),
	}),
]
