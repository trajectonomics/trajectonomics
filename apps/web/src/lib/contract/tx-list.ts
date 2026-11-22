import { z } from "zod"
import { accountRef } from "./account-ref"
import { dateString } from "./date"
import { money } from "./money"

/** One posting of a transaction, with its account and its project dimensions. */
const posting = z.strictObject({
	ordinal: z.number().int().safe(),
	account: accountRef,
	amount: money,
	currency: z.string(),
	dimensions: z.record(z.string(), z.string()).nullable(),
})

/** `traj tx list --json`: the transactions in a period, with their postings. */
export const txList = z.strictObject({
	transactions: z.array(
		z.strictObject({
			id: z.string(),
			date: dateString,
			memo: z.string().nullable(),
			linkedTo: z.string().nullable(),
			externalRef: z.string().nullable(),
			postings: z.array(posting),
		}),
	),
	hint: z.string().optional(),
})
export type TxList = z.infer<typeof txList>
