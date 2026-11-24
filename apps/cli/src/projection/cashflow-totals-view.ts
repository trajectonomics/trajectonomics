import { z } from "zod"
import { dateField, moneyField } from "./money"

/**
 * The section totals of each Annual roll-up, in the order a person reads them (cli ADR-0058, addendum):
 * `money in` is income (an Account's payouts included, because they landed as income), withdrawals and drawn; `tax` is prepaid and settlements; `spending` is the
 * roll-up's expense; `saving` is its applied contributions; `not funded` its unfunded part; `left over`
 * its surplus; `unmet` the Shortfall. Each is the exact sum of the lines it names, or the engine's field.
 */
export const CASHFLOW_TOTALS = [
	"money in",
	"tax",
	"withdrawals",
	"drawn",
	"spending",
	"saving",
	"not funded",
	"left over",
	"unmet",
] as const

export type CashflowTotal = (typeof CASHFLOW_TOTALS)[number]

/** One section total of one Annual roll-up. Every roll-up states all nine, zero included. */
export type CashflowTotalRow = {
	index: number
	from: string
	to: string
	total: CashflowTotal
	amount: string
}

export const cashflowTotalRow: z.ZodType<CashflowTotalRow> = z.strictObject({
	index: z.number().int().describe("The Annual roll-up's index, as the annual table states it."),
	from: dateField("The roll-up's first day"),
	to: dateField("The roll-up's last day"),
	total: z
		.enum(CASHFLOW_TOTALS)
		.describe(
			"The section: money in (income, payouts, withdrawals and drawn together), tax (prepaid and settlements together, a refund netting off), withdrawals (planned withdrawals: borrowed from liabilities, or sold from assets), drawn (taken from an Account by cashflow.withdraw), spending (the roll-up's expense), saving (contributions applied into Accounts), not funded (contributions the cash could not fund), left over (surplus filled into Accounts) or unmet (spending the run could not fund).",
		),
	amount: moneyField(
		"The section's total; a tax total is negative when refunds exceed prepayments",
	),
})

/** The `cashflowTotals` table of `projection run --breakdown` (cli ADR-0058, addendum). */
export type CashflowTotalsTable = {
	name: "cashflowTotals"
	count: number
	rows: CashflowTotalRow[]
}

export const cashflowTotalsTable: z.ZodType<CashflowTotalsTable> = z.strictObject({
	name: z
		.literal("cashflowTotals")
		.describe("Each Annual roll-up's section totals, present only with --breakdown."),
	count: z.number().int().describe("The number of section-total rows."),
	rows: z
		.array(cashflowTotalRow)
		.describe(
			"Nine rows per Annual roll-up, one per section in the order money in, tax, withdrawals, drawn, spending, saving, not funded, left over and unmet, roll-up by roll-up. Each is the exact sum of the roll-up's engine lines or its engine figure, as a decimal string at the Currency's scale, and zero is stated. money in + unmet equals tax + spending + saving + left over.",
		),
})
