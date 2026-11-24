import { z } from "zod"

/** One account's stated value, as the batch document and the single form both say it. */
export type ValueEntry = { account: string; date: string; value: string }

export type ValueDocument = { against: string; values: ValueEntry[] }

/** The most values one document may state; a ledger past this is imported in parts. */
export const MAX_VALUES = 5000

const entry: z.ZodType<ValueEntry> = z.strictObject({
	account: z.string().min(1).describe("The valued account's exact name or id."),
	date: z.string().describe("The YYYY-MM-DD date the value is stated for."),
	value: z
		.string()
		.describe(
			"A decimal string in the account's currency: an asset's value, which may be negative, or what a liability still owes, a positive amount.",
		),
})

/**
 * The JSON document `traj account value --file` reads (ADR-0020): one `against` account for every
 * value, and the values themselves. The CLI applies them in date order, then account id order,
 * whatever order they are listed in.
 */
export const valueDocument: z.ZodType<ValueDocument> = z.strictObject({
	against: z
		.string()
		.min(1)
		.describe(
			"The income or equity Leaf Account every difference is posted against, by exact name or id.",
		),
	values: z
		.array(entry)
		.min(1)
		.max(MAX_VALUES)
		.describe("What each account was worth on each date; applied in date order, then account id."),
})

/** The document `--template` prints: a complete one the schema above accepts (ADR-0033). */
const TEMPLATE: ValueDocument = {
	against: "Market gains",
	values: [
		{ account: "Index fund", date: "2026-03-31", value: "250000.00" },
		{ account: "Home loan", date: "2026-03-31", value: "1800000.00" },
	],
}

export const valueTemplate: string = JSON.stringify(TEMPLATE, null, 2)
