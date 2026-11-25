import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { networthForm } from "../../report/networth-form"
import { monthlySchema, resultSchema } from "../../report/networth-schema"
import { recordNoteBlocks } from "../../report/record"
import { totalDisplay } from "../../report/total"
import { LEDGER_READ_CODES } from "../../store"

export const networth: Leaf = defineCommand({
	name: "networth",
	summary: "Show the assets and liabilities behind net worth at a date, or at every month-end",
	description:
		"Two forms. --as-of states one date. --monthly --until [--since] states every month-end from the month of --since (or of the first Transaction) to --until in one read, each exactly what --as-of gives for that date; a month the Ledger refuses is stated as that refusal, in place.",
	positionals: [],
	input: z.strictObject({
		asOf: z
			.string()
			.optional()
			.describe("The date the result is stated at, as YYYY-MM-DD; required without --monthly."),
		monthly: z
			.boolean()
			.optional()
			.describe("State net worth at every month-end from --since to --until instead of one date."),
		since: z
			.string()
			.optional()
			.describe(
				"With --monthly, the range's inclusive start date; omit to start at the month of the first Transaction.",
			),
		until: z
			.string()
			.optional()
			.describe("With --monthly, the range's inclusive end date, as YYYY-MM-DD; required."),
	}),
	output: z.union([resultSchema, monthlySchema]),
	render: { blocks: recordNoteBlocks, display: totalDisplay("totals", "totalsError") },
	examples: [
		{
			command: "traj report networth --as-of 2026-03-31 --json",
			description: "The asset and liability balances that make up net worth.",
		},
		{
			command: "traj report networth --monthly --since 2026-01-01 --until 2026-03-31 --json",
			description: "Net worth at each month-end of a period, in one read.",
		},
	],
	errorCodes: [
		"INVALID_DATE",
		"INVALID_PERIOD",
		"AMOUNT_OVERFLOW",
		"invalid_input",
		...LEDGER_READ_CODES,
	],
	run: (input, ctx) => networthForm(input, ctx),
})
