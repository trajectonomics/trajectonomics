import { z } from "zod"
import { spendingTables } from "./chance-spending-tables"
import type { ChanceBandView, ChanceRunsOutView, ChanceTable } from "./chance-view"
import { dateField, moneyField } from "./money"

const percentile = z.strictObject({
	level: z
		.number()
		.int()
		.describe("The Percentile, from the engine's fixed set: 10, 25, 50, 75, 90."),
	value: moneyField("Closing net worth at this Percentile across Market paths"),
})

export const band: z.ZodType<ChanceBandView> = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	to: dateField("The roll-up's last day"),
	netWorth: z.array(percentile).describe("The Percentiles of closing net worth, in level order."),
})

/** The same Bands in today's money, published only when the model has an inflation factor. */
export const realBandsField: z.ZodOptional<z.ZodArray<z.ZodType<ChanceBandView>>> = z
	.array(band)
	.optional()
	.describe(
		"The same Bands in each Market path's own today's money, in order; present only when the Return model has an inflation factor (cli ADR-0085).",
	)

export const runsOut: z.ZodType<ChanceRunsOutView> = z.strictObject({
	index: z.number().int().describe("The roll-up in which the failing paths first ran out, from 0."),
	to: dateField("The roll-up's last day"),
	paths: z.number().int().describe("Failing Market paths whose Runs-out falls in that roll-up."),
})

const tableRow = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	to: dateField("The roll-up's last day"),
	p10: moneyField("Net worth at the 10th Percentile"),
	p50: moneyField("Net worth at the 50th Percentile"),
	// Present only when the model has an inflation factor, so a run without one keeps its bytes.
	p50Real: moneyField("Net worth at the 50th Percentile in today's money").optional(),
	p90: moneyField("Net worth at the 90th Percentile"),
})

export const bandsTable: z.ZodType<ChanceTable> = z.union([
	z.strictObject({
		name: z.literal("bands").describe("The Bands the human form prints."),
		count: z.number().int().describe("The number of rows."),
		rows: z.array(tableRow).describe("A few roll-ups, the first, every fifth and the last."),
	}),
	...spendingTables,
])
