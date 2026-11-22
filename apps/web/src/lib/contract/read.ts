import { z } from "zod"

/** The error envelope of a failed `traj` call, kept as the CLI printed it. */
export const errorBody = z.strictObject({
	code: z.string(),
	exitCode: z.number().int(),
	message: z.string(),
	path: z.string().optional(),
	hint: z.string().optional(),
	details: z.unknown().optional(),
})
export type ErrorBody = z.infer<typeof errorBody>

/** One `traj` call in a Snapshot: its argv, and either its parsed data or its error envelope. */
export type Read<T> =
	| { argv: string[]; ok: true; data: T }
	| { argv: string[]; ok: false; error: ErrorBody }

/** The schema of a Read whose successful data has the given schema. */
export function readOf<T extends z.ZodType>(data: T): z.ZodType<Read<z.output<T>>> {
	return z.discriminatedUnion("ok", [
		z.strictObject({ argv: z.array(z.string()), ok: z.literal(true), data }),
		z.strictObject({ argv: z.array(z.string()), ok: z.literal(false), error: errorBody }),
	]) as z.ZodType<Read<z.output<T>>>
}
