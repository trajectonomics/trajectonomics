import { z } from "zod"

/**
 * The CLI's own sentences about a plan's stored claims, kept from a `scenario tax --from-stored --dry-run`
 * result: the separate-loans note on `allowances.mortgageInterestCeiling` (null when it states none) and
 * the `unclaimed` sentences. The page shows each as it is, so it invents no wording.
 */
export const taxNotes = z.strictObject({
	separateLoans: z.string().nullable(),
	unclaimed: z.array(z.string()),
})
export type TaxNotes = z.infer<typeof taxNotes>
