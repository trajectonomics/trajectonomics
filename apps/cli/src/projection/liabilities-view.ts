import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `projection run --liabilities`' two tables (cli ADR-0059): one statement row per
 * liability and calendar month, and one paid-off row per liability. The engine decides every figure
 * (sim ADR-0017); these are the names a person and the output schema read.
 */

/**
 * One liability's month: the amount owed at its start and end, what was borrowed into it and paid
 * out of it, and the interest that is the residual between them. Money is a decimal string.
 */
export type LiabilityRow = {
	account: string
	from: string
	to: string
	opening: string
	drawn: string
	paid: string
	/** What transfers paid the liability down by in the month, apart from `paid`; present only when a transfer Flow targets it (sim ADR 0031). */
	transferred?: string | undefined
	interest: string
	closing: string
	partial: boolean
}

/** One liability's paid-off date: the date its amount owed reached zero, or null when it did not by the end. */
export type PaidOffRow = {
	account: string
	date: string | null
}

export const liabilityRow: z.ZodType<LiabilityRow> = z.strictObject({
	account: z.string().describe("The liability Account's id, as the Scenario spells it."),
	from: dateField("The first day of the month, or of the Projection for its first month"),
	to: dateField("The last day of the month, or of the Projection for its last month"),
	opening: moneyField("The amount owed at the start, Accrued interest included"),
	drawn: moneyField("Planned withdrawals that borrowed into the liability in the month"),
	paid: moneyField("Debt payments applied in the month, after the cap at the amount owed"),
	transferred: moneyField(
		"What transfer Flows paid the liability down by in the month, from the plan's own Accounts: a payment kept apart from paid, so opening + drawn + interest − paid − transferred = closing; present only on a liability a transfer Flow targets",
	).optional(),
	interest: moneyField(
		"The interest of the month: closing less opening, drawn, paid and transferred, so they add up exactly",
	),
	closing: moneyField("The amount owed at the end, Accrued interest included"),
	partial: z
		.boolean()
		.describe("True when the month is cut by the As-of, the horizon or a run-out date."),
})

export const paidOffRow: z.ZodType<PaidOffRow> = z.strictObject({
	account: z.string().describe("The liability Account's id, as the Scenario spells it."),
	date: dateField(
		"The first date the amount owed reached zero after being above zero, or null when it never did by the end",
	).nullable(),
})

/** The months table of `--liabilities`: one row per liability and month (cli ADR-0059). */
export type LiabilityMonthsTable = { name: "liabilities"; count: number; rows: LiabilityRow[] }

export const liabilityMonthsTable: z.ZodType<LiabilityMonthsTable> = z.strictObject({
	name: z
		.literal("liabilities")
		.describe("Each liability's statement, present only with --liabilities."),
	count: z.number().int().describe("The number of statement rows."),
	rows: z
		.array(liabilityRow)
		.describe(
			"One row per liability and calendar month, in Scenario order then date order. The figures are the engine's, as decimal strings at the Currency's scale.",
		),
})

/** The paid-off table of `--liabilities`: one row per liability (cli ADR-0059). */
export type PaidOffTable = { name: "paidOff"; count: number; rows: PaidOffRow[] }

export const paidOffTable: z.ZodType<PaidOffTable> = z.strictObject({
	name: z
		.literal("paidOff")
		.describe("Each liability's paid-off date, present only with --liabilities."),
	count: z.number().int().describe("The number of liabilities."),
	rows: z.array(paidOffRow).describe("One row per liability, in Scenario order."),
})
