import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"

/**
 * One section total of an Annual roll-up (cli ADR-0058, addendum): the section's `total` and its amount,
 * a decimal string at the Currency's scale. The Dashboard shows these; it never sums money.
 */
export const cashflowTotalRow = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	total: z.enum([
		"money in",
		"tax",
		"withdrawals",
		"drawn",
		"spending",
		"saving",
		"not funded",
		"left over",
		"unmet",
	]),
	amount: money,
})
