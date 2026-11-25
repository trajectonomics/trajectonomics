import { z } from "zod"
import { amountRow, currencyTotal } from "./amount-row"
import { dateString } from "./date"
import { errorBody } from "./read"

/** `traj report pnl --since --until --json`: income and expense over a period. */
export const pnl = z.strictObject({
	since: dateString.nullable(),
	until: dateString,
	project: z.string().nullable(),
	rows: z.array(amountRow),
	// Null when the rows' sum leaves the safe range (cli ADR 0079): every row is still stated, and `totalsError` says why.
	totals: z.array(currencyTotal).nullable(),
	totalsError: errorBody.optional(),
	hint: z.string().optional(),
})
export type Pnl = z.infer<typeof pnl>
