import { z } from "zod"
import { amountRow, currencyTotal } from "./amount-row"
import { dateString } from "./date"
import { errorBody } from "./read"

/** `traj report networth --as-of --json`: the assets and liabilities behind net worth at a date. */
export const netWorth = z.strictObject({
	asOf: dateString,
	firstTransactionDate: dateString.nullable(),
	noTransactionsBefore: z.boolean(),
	rows: z.array(amountRow),
	// Null when the accounts' sum leaves the safe range (cli ADR 0079): every row is still stated, and `totalsError` says why.
	totals: z.array(currencyTotal).nullable(),
	totalsError: errorBody.optional(),
	hint: z.string().optional(),
})
export type NetWorth = z.infer<typeof netWorth>
