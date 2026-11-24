import { z } from "zod"

/** The flags that choose how `scenario tax` builds on the stored tax profile (cli ADR-0066). */
export const MODE_FLAGS: {
	merge: z.ZodOptional<z.ZodBoolean>
	fromStored: z.ZodOptional<z.ZodBoolean>
	none: z.ZodOptional<z.ZodBoolean>
} = {
	merge: z
		.boolean()
		.optional()
		.describe(
			"Change only the profile flags given and keep the rest of the stored tax profile; needs a stored profile and at least one profile flag, and takes --tax only when it names the stored jurisdiction.",
		),
	fromStored: z
		.boolean()
		.optional()
		.describe(
			"Write the Levy again from the stored tax profile, for example after a tax-year update; needs a stored profile and takes no profile flag.",
		),
	none: z
		.boolean()
		.optional()
		.describe("Remove the tax Levy and the stored tax profile instead of writing one."),
}
