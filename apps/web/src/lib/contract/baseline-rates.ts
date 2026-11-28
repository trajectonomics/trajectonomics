import { z } from "zod"
import { accountRef } from "./account-ref"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"

/** The Account's own type, the CLI's closed set. */
export const baselineRateType = z.enum(["income", "expense"])

/** How often a row's amount occurs: monthly, or yearly when every active month is one calendar month. */
export const baselineRateFrequency = z.enum(["monthly", "yearly"])

/** Why a row is not in the template: the CLI's closed set, never a sentence. */
export const baselineRateLeftOut = z.enum(["archived", "negative", "zero"])

/** A whole month, as the CLI states a row's first and last month: `YYYY-MM`. */
const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "a YYYY-MM month")

/** The whole calendar months a rates window spans, or the part of it the record covers. */
const rateWindow = z.strictObject({ from: dateString, to: dateString })

/** One income or expense Account's run-rate, as `baseline rates` states it. */
export const baselineRateRow = z.strictObject({
	account: accountRef,
	type: baselineRateType,
	archived: z.boolean(),
	firstMonth: monthString,
	lastMonth: monthString,
	monthsWithActivity: integer,
	total: money,
	frequency: baselineRateFrequency,
	amount: money,
	start: dateString,
	inTemplate: z.boolean(),
	// Present only when inTemplate is false.
	leftOutBecause: baselineRateLeftOut.optional(),
})
export type BaselineRateRow = z.infer<typeof baselineRateRow>

/** One type's sum over every row, refused rows included; `monthly` is null when no whole month is covered. */
const rateTotal = z.strictObject({
	type: baselineRateType,
	total: money,
	monthly: money.nullable(),
})

/**
 * `traj baseline rates --as-of --json`: what each income and expense Account ran at over whole recorded
 * months, and the totals. Money stays a decimal string (web ADR 0002).
 */
export const baselineRates = z.strictObject({
	asOf: dateString,
	months: integer,
	window: rateWindow,
	covered: rateWindow.nullable(),
	monthsCovered: integer,
	firstTransactionDate: dateString.nullable(),
	noTransactionsBefore: z.boolean(),
	currency: z.string(),
	rounding: z.literal("half-away-from-zero"),
	rows: z.array(baselineRateRow),
	totals: z.array(rateTotal),
	hint: z.string().optional(),
})
export type BaselineRates = z.infer<typeof baselineRates>
