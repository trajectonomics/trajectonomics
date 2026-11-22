import { z } from "zod"
import { integer } from "./integer"

/** One household person's age on a row's date, or at the FI date (cli ADR-0048). */
export const personAge = z.strictObject({ person: z.string(), age: integer })

/** Each household person's age, in household order; empty without a household. */
export const personAges = z.array(personAge)
