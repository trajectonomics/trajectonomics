import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `projection run --breakdown`'s `transfers` table (cli ADR-0070, sim ADR 0031): what each
 * transfer Flow moved between the plan's own Accounts in each Annual roll-up. The engine decides every
 * line and figure; these are the names a person, an agent and the Dashboard read.
 */

/** One transfer Flow's year: the Accounts it moved between, what moved and what could not. */
export type TransferRow = {
	index: number
	from: string
	to: string
	flow: string
	source: string
	target: string
	amount: string
	unmoved: string
}

export const transferRow: z.ZodType<TransferRow> = z.strictObject({
	index: z.number().int().describe("The Annual roll-up's index, as the annual table states it."),
	from: dateField("The roll-up's first day"),
	to: dateField("The roll-up's last day"),
	flow: z.string().describe("The transfer Flow's id, as the Scenario spells it."),
	source: z.string().describe("The Account the money left, as the Scenario spells its id."),
	target: z
		.string()
		.describe("The Account the money went into: an asset, or a liability it paid down."),
	amount: moneyField("What moved in the roll-up"),
	unmoved: moneyField(
		"What the Flow planned and did not move: the source held less, was locked, or the loan owed less. It is no Shortfall and is in no net. For a Flow that reads its source with an `account` Measure it also counts what left the source before the transfer that day",
	),
})

/** The table `--breakdown` adds when the Scenario declares a transfer Flow (cli ADR-0070). */
export type TransfersTable = { name: "transfers"; count: number; rows: TransferRow[] }

export const transfersTable: z.ZodType<TransfersTable> = z.strictObject({
	name: z
		.literal("transfers")
		.describe(
			"What each transfer Flow moved between the plan's own Accounts, present only with --breakdown and a Scenario that declares a transfer Flow.",
		),
	count: z.number().int().describe("The number of transfer rows."),
	rows: z
		.array(transferRow)
		.describe(
			"One row per Annual roll-up and transfer Flow that moved, or could not move, something, roll-up by roll-up, the Flows in Scenario order. A transfer is outside cashflow: it is in no cash-flow line and no section total, and net worth is the same before and after it. The figures are the engine's, as decimal strings at the Currency's scale.",
		),
})
