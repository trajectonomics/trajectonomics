import type { AccountType } from "@trajectonomics/core/ledger"
import { z } from "zod"
import { ACCOUNT_TYPE_VALUES, type AccountRef, accountRef } from "../account/view"
import type { TotalRefusal } from "./total"
import { totalRefusal } from "./total-view"

/** One Account's amount in a report: named, typed, and rendered at its currency's scale. */
export type ReportRow = {
	account: AccountRef
	type: AccountType
	amount: string
	currency: string
}

/** One per-currency total. */
export type TotalView = { currency: string; amount: string }

/** One Account's Trial Balance row: its net Balance split into non-negative magnitudes. */
export type TrialRowView = {
	account: AccountRef
	debit: string
	credit: string
	currency: string
}

/** One per-currency Trial Balance total. */
export type TrialTotalView = { currency: string; debit: string; credit: string }

/** The Trial Balance of `balance`: its totals are null, with the reason, when their sum leaves the safe range. */
export type TrialBalanceReport = {
	rows: TrialRowView[]
	totals: TrialTotalView[] | null
	totalsError?: TotalRefusal | undefined
}

export const reportRow: z.ZodType<ReportRow> = z.strictObject({
	account: accountRef.describe("The Account this Balance belongs to."),
	type: z
		.enum(ACCOUNT_TYPE_VALUES)
		.describe("The Account's type, which says how to read the sign."),
	amount: z.string().describe("Decimal string at the currency's own scale; raw signed units."),
	currency: z.string().describe("The row's ISO 4217 currency; v1 is THB only."),
})

export const totalView: z.ZodType<TotalView> = z.strictObject({
	currency: z.string().describe("The total's ISO 4217 currency; v1 is THB only."),
	amount: z.string().describe("Decimal string at the currency's own scale."),
})

export const trialRow: z.ZodType<TrialRowView> = z.strictObject({
	account: accountRef.describe("The Account this row belongs to."),
	debit: z.string().describe("The non-negative magnitude in the debit column."),
	credit: z.string().describe("The non-negative magnitude in the credit column."),
	currency: z.string().describe("The row's ISO 4217 currency; v1 is THB only."),
})

export const trialTotal: z.ZodType<TrialTotalView> = z.strictObject({
	currency: z.string().describe("The total's ISO 4217 currency; v1 is THB only."),
	debit: z.string().describe("The sum of every row's debit, a non-negative decimal string."),
	credit: z.string().describe("The sum of every row's credit, a non-negative decimal string."),
})

export const trialBalanceView: z.ZodType<TrialBalanceReport> = z.strictObject({
	rows: z.array(trialRow).describe("One row per Leaf Account, in `account list` order."),
	totals: z
		.array(trialTotal)
		.nullable()
		.describe(
			"One entry per currency, by currency; null when a column's sum leaves the safe range, and `totalsError` says so. Every row is still stated.",
		),
	totalsError: totalRefusal
		.optional()
		.describe("Why `totals` is null, present only then. The call still exits 0."),
})
