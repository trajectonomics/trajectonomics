import { z } from "zod"

/**
 * The flag both writes that name a stored plan take: the content hash the caller read, which the
 * write is refused over when the stored plan has another (cli ADR-0055).
 */
export const IF_HASH: z.ZodOptional<z.ZodString> = z
	.string()
	.regex(/^jcs1:sha256:[0-9a-f]{64}$/, "a contentHash is jcs1:sha256: and 64 lower-case hex digits")
	.optional()
	.describe(
		"Refuse the write unless the stored plan's contentHash is this one, as traj scenario show prints it (ADR-0055).",
	)
