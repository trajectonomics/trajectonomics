import { z } from "zod"

/** An account as a result names it: its id and its exact name. */
export const accountRef = z.strictObject({ id: z.string(), name: z.string() })
export type AccountRef = z.infer<typeof accountRef>
