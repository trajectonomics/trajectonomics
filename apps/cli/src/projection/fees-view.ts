import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of the `fees` table (cli ADR-0067): what each fee Account was charged in each Annual
 * roll-up. The engine decides every figure (sim ADR 0028); these are the names a person, an agent and
 * the Dashboard read.
 */

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
