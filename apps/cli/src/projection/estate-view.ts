import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `projection run --estate`'s two tables (cli ADR-0064): what the plan would leave on
 * each roll-up's end (or each monthly row), and each cost and gift on those dates. The engine decides
 * every figure (sim ADR 0025); these are the names a person, an agent and the Dashboard read.
 */

/**
 * The estate on one date: the gross estate, the debts, the costs and gifts in total, the net, what
 * heirs receive, and the net and what heirs receive in today's money. Money is a decimal string.
 */
export type EstateRow = {
	date: string
	gross: string
	debts: string
	costs: string
	net: string
	gifts: string
	toHeirs: string
	realNet: string
	realToHeirs: string
}

export const estateRow: z.ZodType<EstateRow> = z.strictObject({
	date: dateField("The date of the monthly row the estate is stated on"),
	gross: moneyField(
		"Everything owned: every asset Account's value, locked and illiquid ones, a home included",
	),
	debts: moneyField("Every liability's amount owed"),
	costs: moneyField("The sum of the cost lines on the date, 0 when the Scenario states none"),
	net: moneyField(
		"The gross estate less the debts and the costs; negative when they exceed everything owned, and then no gift is made and heirs receive nothing",
	),
	gifts: moneyField("The sum of the gifts on the date, taken only from a positive net"),
	toHeirs: moneyField("What heirs receive: the net estate less the gifts, never below 0"),
	realNet: moneyField("The net estate in today's money, deflated as the row's realNetWorth is"),
	realToHeirs: moneyField("What heirs receive in today's money; 0 when toHeirs is 0"),
})

/** One cost or gift on one date. */
export type EstateLineRow = { date: string; line: string; kind: "cost" | "gift"; amount: string }

export const estateLineRow: z.ZodType<EstateLineRow> = z.strictObject({
	date: dateField("The date of the monthly row the line is stated on"),
	line: z.string().describe("The cost's or gift's id, as the Scenario's estate block spells it."),
	kind: z.enum(["cost", "gift"]).describe("Whether the line is a settlement cost or a gift."),
	amount: moneyField("What the line takes on the date, as the engine states it"),
})

/** The table `--estate` adds: one row per roll-up's end, or per monthly row (cli ADR-0064). */
export type EstateTable = { name: "estate"; count: number; rows: EstateRow[] }

export const estateTable: z.ZodType<EstateTable> = z.strictObject({
	name: z.literal("estate").describe("What the plan would leave, present only with --estate."),
	count: z.number().int().describe("The number of estate rows."),
	rows: z
		.array(estateRow)
		.describe(
			"One row per roll-up's end in order, or per monthly row with --monthly. A Scenario with no estate block is still stated, with costs and gifts 0, so net is the gross estate less the debts. Every figure is the engine's, as decimal strings at the Currency's scale.",
		),
})

/** The table `--estate` adds beside it: each cost and gift on each of those dates. */
export type EstateLinesTable = { name: "estateLines"; count: number; rows: EstateLineRow[] }

export const estateLinesTable: z.ZodType<EstateLinesTable> = z.strictObject({
	name: z.literal("estateLines").describe("Each cost and gift, present only with --estate."),
	count: z.number().int().describe("The number of line rows."),
	rows: z
		.array(estateLineRow)
		.describe(
			"One row per date and line, date by date in order, each date's costs then its gifts, each in the order the estate block states them. Empty when the block states none.",
		),
})

/** Both tables, as the projection's table list holds them. */
export type EstateTables = EstateTable | EstateLinesTable
export const estateTables: readonly [z.ZodType<EstateTable>, z.ZodType<EstateLinesTable>] = [
	estateTable,
	estateLinesTable,
]
