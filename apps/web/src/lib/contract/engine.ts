import { z } from "zod"

/** The engine that computed a projection: its package name and version. */
export const engine = z.strictObject({ package: z.string(), version: z.string() })
export type Engine = z.infer<typeof engine>
