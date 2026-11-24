import { z } from "zod"
import type { PersonAge } from "../scenario/household/ages"
import { dateField, moneyField } from "./money"
import { personAges } from "./person-ages"

/** One year of the engine's roll-up, nominal, beside the real figure at its own date. */
export type AnnualRow = {
	index: number
	from: string
	to: string
	ages: PersonAge[]
	openingNetWorth: string
	closingNetWorth: string
	income: string
	/** Planned withdrawals landed in the roll-up; present only when the Scenario declares one (sim ADR-0016). */
	withdrawals?: string | undefined
	/** Payouts landed as passive income, already inside `income`; present only when an Account pays out (sim ADR 0027). */
	payouts?: string | undefined
	/** Employer Contributions landed in Accounts, outside `income`; present only when the Scenario declares one (sim ADR 0026). */
	employerContributions?: string | undefined
	/** Fees charged to Accounts, outside cashflow; present only when an Account carries a fee above 0 bps (sim ADR 0028). */
	fees?: string | undefined
	expense: string
	contributions: string
	unfundedContributions: string
	interest: string
	unmet: string
	partial: boolean
	realNetWorth: { date: string; amount: string }
}

/** One monthly row of the Projection, nominal and real. */
export type MonthlyRow = {
	date: string
	ages: PersonAge[]
	netWorth: string
	realNetWorth: string
	accessibleNetWorth: string
	realAccessibleNetWorth: string
}

export const annualRow: z.ZodType<AnnualRow> = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	from: dateField("The roll-up's first day"),
	to: dateField("The roll-up's last day"),
	ages: personAges,
	openingNetWorth: moneyField("Net worth on the roll-up's first day"),
	closingNetWorth: moneyField("Net worth on the roll-up's last day"),
	income: moneyField("Income the roll-up landed"),
	withdrawals: moneyField(
		"Planned withdrawals the roll-up landed, borrowed from liabilities; present only when the Scenario declares a withdrawal Flow",
	).optional(),
	payouts: moneyField(
		"Payouts the roll-up landed as passive income; already inside income, and outside interest; present only when an Account pays out",
	).optional(),
	employerContributions: moneyField(
		"Employer Contributions the roll-up landed in Accounts; outside income, contributions and interest, because the money never entered cashflow; present only when the Scenario declares one",
	).optional(),
	fees: moneyField(
		"Fees the roll-up charged to Accounts; they left the Accounts outside cashflow and are not in interest, which is growth before the fee; present only when an Account carries a fee above 0 bps",
	).optional(),
	expense: moneyField("Expense the roll-up landed"),
	contributions: moneyField("Contributions the roll-up funded"),
	unfundedContributions: moneyField("Contributions the roll-up could not fund"),
	interest: moneyField("Interest the roll-up accrued"),
	unmet: moneyField("Spending the roll-up could not fund"),
	partial: z
		.boolean()
		.describe("True when the roll-up covers less than a year, as the last one does."),
	realNetWorth: z
		.strictObject({
			date: dateField("The monthly row these real terms are measured at"),
			amount: moneyField("Net worth in the Projection's start-of-timeline terms"),
		})
		.describe(
			"The engine's real net worth at the roll-up's end, dated where the engine states it.",
		),
})

export const monthlyRow: z.ZodType<MonthlyRow> = z.strictObject({
	date: dateField("The row's date"),
	ages: personAges,
	netWorth: moneyField("Net worth on the row's date"),
	realNetWorth: moneyField("Net worth in start-of-timeline terms"),
	accessibleNetWorth: moneyField("Net worth that is not locked and not marked illiquid"),
	realAccessibleNetWorth: moneyField("Accessible net worth in start-of-timeline terms"),
})
