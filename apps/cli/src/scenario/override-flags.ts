import { z } from "zod"

/*
 * The Override flags the projection leaves and `scenario fork` share (ADR-0024, cli ADR-0055): one
 * definition each, so the help, `traj schema` and the leaves cannot drift.
 */

/** `--set`, one transient Override, repeatable and in command-line order (ADR-0024). */
export const setFlag: z.ZodOptional<z.ZodArray<z.ZodString>> = z
	.array(z.string())
	.optional()
	.describe(
		"Replace one existing dotted document path with a JSON value; amounts are in satang (100 per THB), or decimal strings with --decimal.",
	)

/** `--without`, one list item taken out by its id, repeatable and applied before every `--set`. */
export const withoutFlag: z.ZodOptional<z.ZodArray<z.ZodString>> = z
	.array(z.string())
	.optional()
	.describe(
		"Take one list item out by its id, such as flows.gym, before any --set. A projection only reads it; scenario fork saves it.",
	)

/** `--decimal`, which reads each money value of a `--set` as a decimal string (cli ADR-0047, ADR-0055). */
export const decimalFlag: z.ZodDefault<z.ZodBoolean> = z
	.boolean()
	.default(false)
	.describe(
		'Read each money amount of a --set as a decimal string of the Currency\'s major unit, such as "90000.50", instead of satang.',
	)
