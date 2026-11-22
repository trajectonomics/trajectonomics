import { z } from "zod"
import { money } from "./money"

/** The basis a Levy tallies a label under. */
export const tallyBasis = z.enum(["gross", "funded", "returns", "gains"])

/** One class a Levy period had already tallied before the As-of. */
export const tally = z.strictObject({ label: z.string(), basis: tallyBasis, amount: money })

/** A Carry-in record as a projection echoes it, and where each one came from. */
export const carryInRecord = z.strictObject({
	levy: z.string(),
	periodStart: z.string(),
	tallies: z.array(tally),
	prepaid: money,
	source: z.enum(["flag", "document", "scope"]),
})
export type CarryInRecord = z.infer<typeof carryInRecord>
