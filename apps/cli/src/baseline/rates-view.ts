import { z } from "zod"
import type { AccountRef } from "../account/view"
import { accountRef } from "../account/view"
import { type RecordStart, recordStartShape } from "../report/record"
import type { LeftOut, RateFrequency } from "./rates-row"

export const RATE_FREQUENCIES: readonly [RateFrequency, ...RateFrequency[]] = ["monthly", "yearly"]
export const LEFT_OUT_VALUES: readonly [LeftOut, ...LeftOut[]] = ["archived", "negative", "zero"]

/** One income or expense Account's run-rate over the covered months. */
export type RateRow = {
	account: AccountRef
	type: "income" | "expense"
	archived: boolean
	firstMonth: string
	lastMonth: string
	monthsWithActivity: number
	total: string
	frequency: RateFrequency
	amount: string
	start: string
	inTemplate: boolean
	leftOutBecause?: LeftOut | undefined
}

/** One type's totals over every row of that type, refused rows included. */
export type RateTotals = { type: "income" | "expense"; total: string; monthly: string | null }

/** `traj baseline rates`: what each income and expense Account ran at over whole recorded months. */
export type BaselineRates = RecordStart & {
	asOf: string
	months: number
	window: { from: string; to: string }
	covered: { from: string; to: string } | null
	monthsCovered: number
	currency: "THB"
	rounding: "half-away-from-zero"
	rows: RateRow[]
	totals: RateTotals[]
	hint?: string | undefined
}

const monthWindow = z.strictObject({
	from: z.string().describe("The first day of the first month, as YYYY-MM-DD."),
	to: z.string().describe("The last day of the last month, as YYYY-MM-DD."),
})

export const rateRow: z.ZodType<RateRow> = z.strictObject({
	account: accountRef.describe("The Account this row is about, in the Ledger's own id."),
	type: z.enum(["income", "expense"]).describe("The Account's own type."),
	archived: z.boolean().describe("True when the Account is closed."),
	firstMonth: z.string().describe("The first covered month with activity, as YYYY-MM."),
	lastMonth: z.string().describe("The last covered month with activity, as YYYY-MM."),
	monthsWithActivity: z.number().int().describe("The covered months whose net sum is not zero."),
	total: z.string().describe("The covered-window total, with income stated positive."),
	frequency: z
		.enum(RATE_FREQUENCIES)
		.describe(
			"Monthly, or yearly when the covered window spans a year and every active month is one month.",
		),
	amount: z.string().describe("One occurrence, rounded half away from zero to the satang."),
	start: z.string().describe("The date the template's Stream starts, as YYYY-MM-DD."),
	inTemplate: z.boolean().describe("True when the template carries this row as a Stream."),
	leftOutBecause: z
		.enum(LEFT_OUT_VALUES)
		.optional()
		.describe("Why it is not in the template; present only when inTemplate is false."),
})

export const rateTotals: z.ZodType<RateTotals> = z.strictObject({
	type: z.enum(["income", "expense"]),
	total: z.string().describe("The sum over every row of this type, refused rows included."),
	monthly: z
		.string()
		.nullable()
		.describe("The total over the covered months, rounded; null when no whole month is covered."),
})

export const baselineRates: z.ZodType<BaselineRates> = z.strictObject({
	asOf: z.string().describe("The date the rates are stated at, as YYYY-MM-DD."),
	months: z.number().int().describe("The window length asked for, with the default applied."),
	window: monthWindow.describe("The whole calendar months asked for."),
	covered: monthWindow
		.nullable()
		.describe("The window the record covers; null when it covers no whole month."),
	monthsCovered: z.number().int().describe("The number of whole months the record covers."),
	...recordStartShape,
	currency: z.literal("THB").describe("The currency every amount is stated in."),
	rounding: z
		.literal("half-away-from-zero")
		.describe("The rule every amount follows, stated so no caller has to guess."),
	rows: z.array(rateRow).describe("One row per income and expense Account with activity."),
	totals: z
		.array(rateTotals)
		.describe("The income entry then the expense entry, always both, in that order."),
	hint: z
		.string()
		.optional()
		.describe("The command that fills an empty answer, present only when the Ledger is why."),
})
