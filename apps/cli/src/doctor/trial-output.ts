import { z } from "zod"
import type { TotalRefusal } from "../report/total"
import { totalRefusal } from "../report/total-view"
import { type TrialTotalView, trialTotal } from "../report/view"

/**
 * The Trial Balance as a check reads it: the figures, and whether the two columns agree. The totals
 * are null, with the reason, when a column's sum leaves the safe range; `balanced` is still a real
 * answer, compared exactly (ADR-0079).
 */
export type DoctorTrialBalance = {
	asOf: string
	totals: TrialTotalView[] | null
	totalsError?: TotalRefusal | undefined
	balanced: boolean
}

export const doctorTrialBalance: z.ZodType<DoctorTrialBalance> = z.strictObject({
	asOf: z.string().describe("The date the Trial Balance is stated at."),
	totals: z
		.array(trialTotal)
		.nullable()
		.describe(
			"One entry per currency; null when a column's sum leaves the safe range, and `totalsError` says so. `balanced` is still stated.",
		),
	totalsError: totalRefusal
		.optional()
		.describe("Why `totals` is null, present only then. The call still exits 0."),
	balanced: z
		.boolean()
		.describe(
			"Whether every currency's debits equal its credits, compared exactly even when the totals are not stated.",
		),
})
