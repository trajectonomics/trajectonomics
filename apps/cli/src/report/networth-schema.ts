import { z } from "zod"
import type { NetWorthResult } from "./networth"
import { recordStartShape } from "./record"
import { reportRow, totalView } from "./view"

/** The single-date result: `--as-of`'s data, and each month of the monthly form. */
export const resultSchema: z.ZodType<NetWorthResult> = z.strictObject({
	asOf: z.string().describe("The date the result is stated at, as YYYY-MM-DD."),
	...recordStartShape,
	rows: z
		.array(reportRow)
		.describe("The asset and liability Leaf Accounts behind the total, in `account list` order."),
	totals: z.array(totalView).describe("Assets minus liabilities, one entry per currency."),
	hint: z
		.string()
		.optional()
		.describe(
			"The command that fills the empty answer, present only when the Ledger is why it is empty.",
		),
})

const refusedMonth = z.strictObject({
	asOf: z.string().describe("The month-end the Ledger refused to state, as YYYY-MM-DD."),
	error: z
		.strictObject({
			code: z.string().describe("The code `--as-of` gives for this date."),
			exitCode: z.number().int().describe("The exit code `--as-of` gives for this date."),
			message: z.string(),
			path: z.string().optional(),
			hint: z.string().optional(),
			details: z.unknown().optional(),
		})
		.describe("The refusal `--as-of` gives for this date, in the fields of its error envelope."),
})

/** The monthly result: one entry per month-end, each a single-date result or its refusal. */
export const monthlySchema: z.ZodType = z.strictObject({
	since: z.string().nullable().describe("The range's inclusive start date as typed, or null."),
	until: z.string().describe("The range's inclusive end date, as YYYY-MM-DD."),
	months: z
		.array(z.union([resultSchema, refusedMonth]))
		.describe(
			"One entry per month-end from the month of `since` (or of the first Transaction) to `until`, oldest first. Each is exactly what `--as-of` gives for that date, or `{asOf, error}` for a date it refuses.",
		),
	hint: z
		.string()
		.optional()
		.describe(
			"The command that fills the empty answer, present only when the Ledger is why it is empty.",
		),
})
