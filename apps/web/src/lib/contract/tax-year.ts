import { z } from "zod"
import { dateString } from "./date"
import { money } from "./money"

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
})
export type TaxYear = z.infer<typeof taxYear>
