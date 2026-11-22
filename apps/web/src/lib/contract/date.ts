import { z } from "zod"

/** A calendar date as YYYY-MM-DD, Gregorian, as the CLI prints it. */
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a YYYY-MM-DD date")
export type DateString = z.infer<typeof dateString>
