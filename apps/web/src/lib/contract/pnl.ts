import { z } from "zod"
import { amountRow, currencyTotal } from "./amount-row"
import { dateString } from "./date"

/** `traj report pnl --since --until --json`: income and expense over a period. */
export const pnl = z.strictObject({
	since: dateString.nullable(),
	until: dateString,
	project: z.string().nullable(),
	rows: z.array(amountRow),
	totals: z.array(currencyTotal),
	hint: z.string().optional(),
})
export type Pnl = z.infer<typeof pnl>
