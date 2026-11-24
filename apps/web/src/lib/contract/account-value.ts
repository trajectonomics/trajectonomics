import { z } from "zod"
import { accountRef } from "./account-ref"
import { dateString } from "./date"
import { money } from "./money"

/** The Valuation entry a write stored: its postings name the account by id, as `tx add` states them. */
const writtenTransaction = z.strictObject({
	id: z.string().nullable(),
	date: dateString,
	memo: z.string().nullable(),
	linkedTo: z.string().nullable(),
	externalRef: z.string().nullable(),
	version: z.number().int().safe(),
	createdAt: z.string(),
	updatedAt: z.string(),
	postings: z.array(
		z.strictObject({
			ordinal: z.number().int().safe(),
			accountId: z.string(),
			amount: money,
			currency: z.string(),
			dimensions: z.record(z.string(), z.string()).nullable(),
		}),
	),
})

/**
 * What one valued entry did. `before`, `value` and `difference` share one reading: an asset's
 * Balance, or what a liability owes. `unchanged` writes nothing and its transaction is null.
 */
const figures = {
	status: z.enum(["added", "unchanged"]),
	account: accountRef,
	date: dateString,
	before: money,
	value: money,
	difference: money,
	transaction: writtenTransaction.nullable(),
	notes: z.array(z.string()),
}

/** `traj account value ACCOUNT --value --date --against --json`: one value, and what it wrote. */
export const accountValue = z.strictObject({
	dryRun: z.boolean(),
	against: accountRef,
	...figures,
})
export type AccountValue = z.infer<typeof accountValue>

/** `traj account value --file --json`: the batch, each entry in the order it was applied. */
export const accountValues = z.strictObject({
	dryRun: z.boolean(),
	file: z.string(),
	against: accountRef,
	values: z.array(z.strictObject({ index: z.number().int().safe(), ...figures })),
	counts: z.strictObject({ added: z.number().int().safe(), unchanged: z.number().int().safe() }),
})
export type AccountValues = z.infer<typeof accountValues>
