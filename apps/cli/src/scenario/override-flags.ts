import { z } from "zod"

/*
 * The Override flags the projection leaves and `scenario fork` share (ADR-0024, cli ADR-0056): one
 * definition each, so the help, `traj schema` and the leaves cannot drift.
 */

/** `--set`, one transient Override, repeatable and in command-line order (ADR-0024). */
export const setFlag: z.ZodOptional<z.ZodArray<z.ZodString>> = z
	.array(z.string())
	.optional()
	.describe(
		"Replace one existing dotted document path with a JSON value; amounts are in satang (100 per THB), or decimal strings with --decimal. The one path a plan may lack is the whole estate block, which --set estate=<json> begins.",
	)

/** `--without`, one list item taken out by its id, repeatable and applied before every `--set`. */
export const withoutFlag: z.ZodOptional<z.ZodArray<z.ZodString>> = z
	.array(z.string())
	.optional()
	.describe(
		"Take one list item out by its id, such as flows.gym, before any --set. A projection only reads it; scenario fork saves it.",
	)

/** `--add`, one new list item, repeatable; applied after every `--without` and before every `--set` (cli ADR-0062). */
export const addFlag: z.ZodOptional<z.ZodArray<z.ZodString>> = z
	.array(z.string())
	.optional()
	.describe(
		'Add one new list item, as list=json, such as flows=\'{"id":"extra","kind":"expense",...}\'; the list is accounts, flows or milestones and the item carries its own id, which must not exist. Applied after any --without and before any --set. A projection only reads it; scenario fork and scenario apply save it.',
	)

/** `--decimal`, which reads each money value of a `--set` or an `--add` item as a decimal string (cli ADR-0047, ADR-0056, ADR-0062). */
export const decimalFlag: z.ZodDefault<z.ZodBoolean> = z
	.boolean()
	.default(false)
	.describe(
		'Read each money amount of a --set or an --add item as a decimal string of the Currency\'s major unit, such as "90000.50", instead of satang.',
	)

/** One applied Override as a command echoes it: its path, escaped and canonical, and its value (ADR-0024). */
export const appliedOverride: z.ZodObject<{
	path: z.ZodString
	value: z.ZodUnknown
}> = z.strictObject({
	path: z.string().describe("The dotted path, escaped and canonical."),
	value: z.unknown().describe("The JSON value the path was set to."),
})

/** The items `--add` put on a list, in command-line order, as the echo states them; absent when none was (cli ADR-0062). */
export const additionsField: z.ZodOptional<z.ZodArray<typeof appliedOverride>> = z
	.array(appliedOverride)
	.optional()
	.describe(
		"The items put on a list with --add, in command-line order, each as its path (list.id) and the item as given; present only when an --add was given.",
	)
