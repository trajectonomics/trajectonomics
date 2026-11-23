import { z } from "zod"

/** A JSON value a Set replaces a path with, or an added item holds. Money is a decimal string the person typed (cli ADR 0056). */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** The schema of a JSON value: finite numbers only. */
export const jsonValue: z.ZodType<Json> = z.lazy(() =>
	z.union([
		z.string(),
		z.number().finite(),
		z.boolean(),
		z.null(),
		z.array(jsonValue),
		z.record(z.string(), jsonValue),
	]),
)
