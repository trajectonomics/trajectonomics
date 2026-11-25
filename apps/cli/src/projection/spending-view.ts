import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `projection run --spending`'s one table (cli ADR-0063): one row per Spending-rule Flow
 * and Rule year, in the engine's statement (sim ADR 0023). The engine decides every figure; these are
 * the names a person, an agent and the Dashboard read.
 */

/** What a Rule year did to the amount it started from, as the engine names it. */
export const RULE_ACTIONS = ["none", "floor", "ceiling", "cut", "raise"] as const

/**
 * One Rule year of one rule Flow. Money is a decimal string, and `realAmount` and `realPaid` are the amount and what was paid in today's money; `withdrawalRate` is a percent string
 * (`"4.00"`), absent when the portfolio was worth nothing, and can be above 100 when the year's amount
 * is more than a depleted portfolio is worth.
 */
export type SpendingRuleRow = {
	flow: string
	date: string
	portfolio: string
	amount: string
	realAmount: string
	paid: string
	realPaid: string
	withdrawalRate?: string | undefined
	action: (typeof RULE_ACTIONS)[number]
}

export const spendingRuleRow: z.ZodType<SpendingRuleRow> = z.strictObject({
	flow: z.string().describe("The rule Flow's id, as the Scenario spells it."),
	date: dateField("The Landed date the Rule year began on, when its amount was fixed"),
	portfolio: moneyField("What the rule's portfolio was worth on that date, before any Flow landed"),
	amount: moneyField("The yearly amount the rule fixed for the Rule year"),
	realAmount: moneyField(
		"The same yearly amount in today's money (the start of the Timeline), deflated once at the Rule year's first date as the row's realNetWorth is",
	),
	paid: moneyField(
		"What the year's occurrences paid: the whole amount, or fewer when the horizon or a Shortfall ends the year. An occurrence a Shortfall fell on counts in full",
	),
	realPaid: moneyField(
		"What the year paid in today's money, deflated once at the Rule year's first date",
	),
	withdrawalRate: z
		.string()
		.optional()
		.describe(
			'The amount as a percent of the portfolio, floored to a basis point, such as "4.00". Absent when the portfolio was worth nothing; above "100.00" when the amount is more than a depleted portfolio is worth.',
		),
	action: z
		.enum(RULE_ACTIONS)
		.describe(
			"What the rule did to the amount it started from: none, floor (lifted to the lowest amount), ceiling (held to the highest), cut or raise (a guardrail).",
		),
})

/** The table `--spending` adds: one row per rule Flow and Rule year (cli ADR-0063). */
export type SpendingRulesTable = { name: "spendingRules"; count: number; rows: SpendingRuleRow[] }

export const spendingRulesTable: z.ZodType<SpendingRulesTable> = z.strictObject({
	name: z
		.literal("spendingRules")
		.describe("What each spending rule paid, present only with --spending."),
	count: z.number().int().describe("The number of Rule-year rows."),
	rows: z
		.array(spendingRuleRow)
		.describe(
			"One row per rule Flow and Rule year, the Flows in Scenario order and each Flow's years in order. A Rule year is twelve monthly occurrences (or one annual one) from the Flow's first landed date, so its date is not a calendar year's. Every figure is the engine's.",
		),
})
