import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `projection run --accounts`' one table (cli ADR-0060): each Account's value on the
 * date of each roll-up's end, or of each monthly row. The engine decides every figure (sim ADR-0019,
 * ADR-0020); these are the names a person, an agent and the Dashboard read. The `fees` table (cli
 * ADR-0067) sits beside them: what each fee Account was charged, which the engine states per roll-up.
 */

/**
 * One Account's value on one date, in nominal and in start-of-timeline terms. Money is a decimal
 * string, and a liability's amount is what is owed, positive, as the engine states it.
 */
export type BalanceRow = {
	date: string
	account: string
	amount: string
	real: string
}

export const balanceRow: z.ZodType<BalanceRow> = z.strictObject({
	date: dateField("The date of the monthly row the value is read on"),
	account: z.string().describe("The Account's id, as the Scenario spells it."),
	amount: moneyField(
		"The Account's value on the date, Accrued interest included; for a liability, what is owed, positive",
	),
	real: moneyField("The same value in the Projection's start-of-timeline terms"),
})

/** The table `--accounts` adds: one row per date and Account (cli ADR-0060). */
export type BalancesTable = { name: "balances"; count: number; rows: BalanceRow[] }

export const balancesTable: z.ZodType<BalancesTable> = z.strictObject({
	name: z.literal("balances").describe("Each Account's value, present only with --accounts."),
	count: z.number().int().describe("The number of balance rows."),
	rows: z
		.array(balanceRow)
		.describe(
			"One row per date and Account, date by date in order, the Accounts in Scenario order. The dates are each roll-up's end, or every monthly row with --monthly. The figures are the engine's, as decimal strings at the Currency's scale.",
		),
})

/** What one Account was charged in one Annual roll-up; zero when it was not charged that year. */
export type FeeRow = {
	index: number
	from: string
	to: string
	account: string
	amount: string
}

export const feeRow: z.ZodType<FeeRow> = z.strictObject({
	index: z.number().int().describe("The Annual roll-up's index, as the annual table states it."),
	from: dateField("The roll-up's first day"),
	to: dateField("The roll-up's last day"),
	account: z.string().describe("The Account's id, as the Scenario spells it."),
	amount: moneyField("What the Account was charged in the roll-up, zero when it was not charged"),
})

/** The table of what each fee Account was charged, present only when an Account carries a fee (cli ADR-0067). */
export type FeesTable = { name: "fees"; count: number; rows: FeeRow[] }

export const feesTable: z.ZodType<FeesTable> = z.strictObject({
	name: z
		.literal("fees")
		.describe(
			"What each fee Account was charged, present only when an Account carries a fee above 0 bps.",
		),
	count: z.number().int().describe("The number of fee rows."),
	rows: z
		.array(feeRow)
		.describe(
			"One row per Annual roll-up and fee Account, roll-up by roll-up, the Accounts in Scenario order. The figures are the engine's, as decimal strings at the Currency's scale. A fee leaves the Account outside cashflow, so it is in no cash-flow line, and the roll-up's fees is the sum of its rows.",
		),
})
