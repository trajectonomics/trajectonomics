import { z } from "zod"

/**
 * The flag both writes that name a stored plan take: the hash the caller read, which the write is
 * refused over when the stored plan has another (cli ADR-0055). `scenario apply` compares the
 * contentHash, and `scenario household` the householdHash that covers the document and household.
 */
export const IF_HASH: z.ZodOptional<z.ZodString> = z
	.string()
	.regex(/^jcs1:sha256:[0-9a-f]{64}$/, "a hash is jcs1:sha256: and 64 lower-case hex digits")
	.optional()
	.describe(
		"Refuse the write unless the stored plan's hash is this one, as traj scenario show prints it: contentHash for apply, householdHash for household (ADR-0055).",
	)
