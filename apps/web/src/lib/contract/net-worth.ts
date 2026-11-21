import { z } from "zod"
import { amountRow, currencyTotal } from "./amount-row"
import { dateString } from "./date"

/** `traj report networth --as-of --json`: the assets and liabilities behind net worth at a date. */
export const netWorth = z.strictObject({
	asOf: dateString,
	firstTransactionDate: dateString.nullable(),
	noTransactionsBefore: z.boolean(),
	rows: z.array(amountRow),
	totals: z.array(currencyTotal),
	hint: z.string().optional(),
})
export type NetWorth = z.infer<typeof netWorth>
