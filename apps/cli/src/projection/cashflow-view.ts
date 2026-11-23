import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `projection run --breakdown`'s long table (cli ADR-0058): one row per roll-up and
 * line. The engine decides every line; these are the names a person and the output schema read.
 */

/** The source a line belongs to, in the order the engine reports them (sim ADR-0018). */
export const CASHFLOW_GROUPS = [
	"income",
	"prepaid",
	"settlement",
	"expense",
	"category",
	"contribution",
	"unfunded",
	"withdrawal",
	"drawn",
	"surplus",
	"unmet",
] as const

export type CashflowGroup = (typeof CASHFLOW_GROUPS)[number]

/**
 * One line of one Annual roll-up. `id` is the Flow for Flow lines, the Levy for `prepaid` and
 * `settlement`, and the category name for `category` lines (null for the uncategorised total). It is
 * null for `drawn`, `surplus` and `unmet`. `account` is set for the Account lines, `category` for an
 * `expense` line that declares one.
 */
export type CashflowRow = {
	index: number
	from: string
	to: string
	group: CashflowGroup
	id: string | null
	account: string | null
	category: string | null
	amount: string
}

export const cashflowRow: z.ZodType<CashflowRow> = z.strictObject({
	index: z.number().int().describe("The Annual roll-up's index, as the annual table states it."),
	from: dateField("The roll-up's first day"),
	to: dateField("The roll-up's last day"),
	group: z
		.enum(CASHFLOW_GROUPS)
		.describe(
			"The line's source: income, prepaid (tax taken at source), settlement (a Levy's settlement, negative for a refund), expense, category (expenses summed per category), contribution (applied into an Account), unfunded (a Contribution the cash could not fund), withdrawal (a planned withdrawal, borrowed from a liability or sold from an asset), drawn (taken from an Account by cashflow.withdraw), surplus (filled into an Account by cashflow.surplus) or unmet (spending the run could not fund).",
		),
	id: z
		.string()
		.nullable()
		.describe(
			"The Flow's id for a Flow line, the Levy's id for prepaid and settlement, the category name for a category line (null for the uncategorised total), and null for drawn, surplus and unmet.",
		),
	account: z
		.string()
		.nullable()
		.describe(
			"The Account a contribution, unfunded, withdrawal, drawn or surplus line moved money into or out of; null otherwise.",
		),
	category: z
		.string()
		.nullable()
		.describe(
			"The category an expense Flow declares; null when it declares none, and on every other line.",
		),
	amount: moneyField("The line's amount; a settlement keeps its sign, so a refund is negative"),
})
