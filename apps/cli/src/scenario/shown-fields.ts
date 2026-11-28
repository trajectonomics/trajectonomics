import { z } from "zod"

/** True when the document holds a tax Levy, whether or not a tax profile is stored beside it (cli ADR-0066). */
export const taxedShape: z.ZodBoolean = z
	.boolean()
	.describe(
		"True when the document holds a tax Levy, whether or not a tax profile is stored beside it (cli ADR-0066).",
	)

/** True for the ledger's main plan, a label and not a default (cli ADR-0071). */
export const mainShape: z.ZodBoolean = z
	.boolean()
	.describe("True when this is the ledger's main plan, a label and not a default (cli ADR-0071).")

/** The notes kept on a plan, or null when it has none (cli ADR-0071). */
export const notesShape: z.ZodNullable<z.ZodString> = z
	.string()
	.nullable()
	.describe(
		"The notes kept on this plan, or null when it has none. Notes are outside the document and its contentHash (cli ADR-0071).",
	)
