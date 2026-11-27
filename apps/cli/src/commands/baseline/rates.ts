import { z } from "zod"
import { baselineRates as runRates } from "../../baseline/rates"
import { ratesRender } from "../../baseline/rates-render"
import { baselineRates as resultSchema } from "../../baseline/rates-view"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { LEDGER_READ_CODES } from "../../store"

const MONTHS = z
	.number()
	.int()
	.min(3)
	.max(36)
	.optional()
	.describe("Whole calendar months in the window, 3 to 36; default 12.")

export const rates: Leaf = defineCommand({
	name: "rates",
	summary: "Show what each income and expense Account ran at over whole recorded months",
	description:
		"The window is the whole calendar months ending at the last full month on or before the As-of. Each income and expense Account with activity gets its total over the months the record covers, and a Run-rate: the total over those months, or over the times its one calendar month falls in them when the window spans a year and every active month is that month. Nothing is inferred beyond that stated rule; a closed, negative or zero row is stated and marked as left out.",
	positionals: [],
	input: z.strictObject({
		asOf: z.string().describe("The date the rates are stated at, as YYYY-MM-DD."),
		months: MONTHS,
	}),
	output: resultSchema,
	render: ratesRender,
	examples: [
		{
			command: "traj baseline rates --as-of 2026-03-31 --json",
			description: "What each income and expense Account ran at over the months recorded.",
		},
		{
			command: "traj baseline rates --as-of 2026-03-31 --months 3",
			description: "The same run-rates over the last three whole months.",
		},
	],
	errorCodes: [
		"INVALID_DATE",
		"invalid_input",
		"AMOUNT_OVERFLOW",
		"unsupported_currency",
		...LEDGER_READ_CODES,
	],
	run: (input, ctx) => runRates(ctx, input),
})
