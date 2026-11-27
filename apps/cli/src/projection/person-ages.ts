import { z } from "zod"
import type { PersonAge } from "../scenario/household/ages"

/**
 * Each household person's age on a row's date, in household order (cli ADR-0048). Empty without a
 * household, so the shape is stable.
 */
export const personAges: z.ZodType<PersonAge[]> = z
	.array(
		z.strictObject({
			person: z.string().describe("The person's id in the household."),
			age: z.number().int().describe("The age the person has reached on the date."),
		}),
	)
	.describe(
		"Each household person's age on the row's date, in household order; empty without a household. An annual row states the ages on its last day, `to`. A partner is left out before the first day of their `joins` month, and a person before the last day of their birth month.",
	)
