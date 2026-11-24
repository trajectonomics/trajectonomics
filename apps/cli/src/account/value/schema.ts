import { z } from "zod"
import { type WrittenTransactionBody, writtenTransactionBody } from "../../tx/view"
import { type AccountRef, accountRef } from "../view"

/** What one valued entry did: a row written, or nothing because the Balance already was the value. */
export type ValueStatus = "added" | "unchanged"

type ValueFigures = {
	index: number
	status: ValueStatus
	account: AccountRef
	date: string
	before: string
	value: string
	difference: string
	transaction: WrittenTransactionBody | null
	notes: string[]
}

export type ValueRow = ValueFigures

/** The one success shape of `account value ACCOUNT`: the row's figures, and what it posts against. */
export type ValueResult = Omit<ValueFigures, "index"> & {
	dryRun: boolean
	against: AccountRef
}

/** The one success shape of `account value --file`; a refused batch is an error envelope. */
export type ValuesResult = {
	dryRun: boolean
	file: string
	against: AccountRef
	values: ValueRow[]
	counts: { added: number; unchanged: number }
}

const FIGURES = {
	status: z
		.enum(["added", "unchanged"])
		.describe(
			"added when the entry wrote a Transaction; unchanged when the Balance already was the value, which writes nothing.",
		),
	account: accountRef.describe("The valued account."),
	date: z.string().describe("The date the value is stated for, as YYYY-MM-DD."),
	before: z
		.string()
		.describe(
			"The account's value on that date before this entry: an asset's Balance, or what a liability owed, with the entries listed earlier in a batch applied.",
		),
	value: z.string().describe("The stated value, in the same terms as `before`."),
	difference: z
		.string()
		.describe('`value` minus `before`; "0.00" when nothing was written, and signed otherwise.'),
	transaction: writtenTransactionBody
		.nullable()
		.describe("The Valuation entry written, or null when nothing was."),
	notes: z
		.array(z.string())
		.describe(
			"What this write moves that the caller did not state, such as a later valuation it makes untrue; empty when none.",
		),
}

const valueRow: z.ZodType<ValueRow> = z.strictObject({
	index: z.number().int().describe("The entry's zero-based position in `values`."),
	...FIGURES,
})

export const valueResult: z.ZodType<ValueResult> = z.strictObject({
	dryRun: z.boolean().describe("True when the write was rolled back."),
	against: accountRef.describe("The account the difference is posted against."),
	...FIGURES,
})

export const valuesResult: z.ZodType<ValuesResult> = z.strictObject({
	dryRun: z.boolean().describe("True when every write was rolled back."),
	file: z.string().describe("The document path as given, or - for stdin."),
	against: accountRef.describe("The account every difference is posted against."),
	values: z.array(valueRow).describe("One entry per value, in the order they were applied."),
	counts: z.strictObject({
		added: z.number().int().describe("Entries that wrote a Valuation entry."),
		unchanged: z.number().int().describe("Entries whose Balance already was the value."),
	}),
})
