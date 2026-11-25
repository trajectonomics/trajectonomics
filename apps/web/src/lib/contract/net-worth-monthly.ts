import { z } from "zod"
import { dateString } from "./date"
import { netWorth } from "./net-worth"
import { errorBody } from "./read"

/**
 * One month-end of `traj report networth --monthly --json`: what `--as-of` states for that date, or, for a date the
 * Ledger refuses (an overflow), the refusal `--as-of` gives, as its error envelope's fields.
 */
export const netWorthMonth = z.union([
	netWorth,
	z.strictObject({ asOf: dateString, error: errorBody }),
])
export type NetWorthMonth = z.infer<typeof netWorthMonth>

/** `traj report networth --monthly --json`: net worth at every month-end of a period, in one read. */
export const netWorthMonthly = z.strictObject({
	since: dateString.nullable(),
	until: dateString,
	months: z.array(netWorthMonth),
	hint: z.string().optional(),
})
export type NetWorthMonthly = z.infer<typeof netWorthMonthly>
