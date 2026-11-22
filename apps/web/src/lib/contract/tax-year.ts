import { z } from "zod"
import { dateString } from "./date"
import { money } from "./money"

/** A tax figure a period used whose source is not yet confirmed (cli ADR 0042). */
export const assumption = z.strictObject({
	path: z.string(),
	value: z.union([z.number(), z.array(z.number())]),
	status: z.enum(["reported", "unsourced"]),
	note: z.string(),
})
export type Assumption = z.infer<typeof assumption>

/** One Levy settlement period: what it owes, what was prepaid, and whether its settlement is in view. */
export const taxYear = z.strictObject({
	levy: z.string(),
	from: dateString,
	to: dateString,
	settlementDate: dateString,
	due: money,
	prepaid: money,
	owed: money,
	settled: z.boolean(),
	partial: z.boolean(),
	assumptions: z.array(assumption),
})
export type TaxYear = z.infer<typeof taxYear>
