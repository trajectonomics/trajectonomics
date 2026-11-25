import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { personAges } from "./person-age"

/*
 * The rows of the projection's optional tables (cli ADR-0049, ADR-0059, ADR-0060, ADR-0063): each
 * loan's months, its paid-off date, each Account's value, each Milestone's date, each spending
 * rule's years and the estate. `projection-tables.ts` names the tables that hold them.
 */

/** One liability's month: the amount owed at each end, what was borrowed and paid, and the interest (cli ADR-0059). */
export const liabilityRow = z.strictObject({
	account: z.string(),
	from: dateString,
	to: dateString,
	opening: money,
	drawn: money,
	paid: money,
	// What transfers paid the liability down by, apart from `paid`; present only on a liability a transfer Flow targets (cli ADR-0070, sim ADR 0031).
	transferred: money.optional(),
	interest: money,
	closing: money,
	partial: z.boolean(),
})

/** One liability's paid-off date, or null when it is not paid off by the end (cli ADR-0059). */
export const paidOffRow = z.strictObject({
	account: z.string(),
	date: dateString.nullable(),
})

/**
 * One Account's value on the date of a roll-up's end, or of a monthly row, nominal and real (cli
 * ADR-0060). A liability's amount is what is owed, positive.
 */
export const balanceRow = z.strictObject({
	date: dateString,
	account: z.string(),
	amount: money,
	real: money,
})

/**
 * What one Account was charged in one Annual roll-up, zero when it was not charged that year (cli
 * ADR-0067, sim ADR 0028).
 */
export const feeRow = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	account: z.string(),
	amount: money,
})

/**
 * What one transfer Flow moved between the plan's own Accounts in one Annual roll-up, and what it planned and did
 * not move (cli ADR-0070, sim ADR 0031). A transfer is outside cashflow: it is in no cash-flow line or total.
 */
export const transferRow = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	flow: z.string(),
	source: z.string(),
	target: z.string(),
	amount: money,
	unmoved: money,
})

/**
 * One Milestone's fire date: the date it fired, or null when it did not fire by the Projection's end
 * (cli ADR-0049). Rows come in Scenario order.
 */
export const milestoneRow = z.strictObject({
	id: z.string(),
	reached: z.boolean(),
	date: dateString.nullable(),
})

/**
 * One Rule year of one spending-rule Flow (cli ADR-0063): the portfolio the rule read, the amount it
 * fixed, what the year paid, each also in today's money, the amount's share of the portfolio as a percent string (absent when the
 * portfolio was worth nothing) and what the rule did to the amount.
 */
export const spendingRuleRow = z.strictObject({
	flow: z.string(),
	date: dateString,
	portfolio: money,
	amount: money,
	realAmount: money,
	paid: money,
	realPaid: money,
	withdrawalRate: z.string().optional(),
	action: z.enum(["none", "floor", "ceiling", "cut", "raise"]),
})

/**
 * What the plan would leave on one date (cli ADR-0064): the gross estate, the debts, the costs and gifts in
 * total, the net (negative when the debts and costs exceed everything owned), what heirs receive, and the
 * net and what heirs receive in today's money.
 */
export const estateRow = z.strictObject({
	date: dateString,
	gross: money,
	debts: money,
	costs: money,
	net: money,
	gifts: money,
	toHeirs: money,
	realNet: money,
	realToHeirs: money,
})

/** One cost or gift on one date, in the order the Scenario's estate block states them (cli ADR-0064). */
export const estateLineRow = z.strictObject({
	date: dateString,
	line: z.string(),
	kind: z.enum(["cost", "gift"]),
	amount: money,
})

/** One monthly row: net worth on the row's date, nominal and real, and the accessible share. */
export const monthlyRow = z.strictObject({
	date: dateString,
	ages: personAges,
	netWorth: money,
	realNetWorth: money,
	accessibleNetWorth: money,
	realAccessibleNetWorth: money,
})
