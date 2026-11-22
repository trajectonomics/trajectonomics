import type { z } from "zod"
import type { Read } from "../src/lib/contract"
import { decodeRead } from "../src/lib/snapshot/decode-read"
import { spawnCapture } from "./spawn"

/** Where the `traj` binary is and the environment its calls run in (TRAJ_HOME selects the ledger). */
export type RunContext = {
	binary: string
	env?: Record<string, string | undefined>
}

/**
 * Runs one planned `traj` read and keeps its result as a Read. The argv already ends with `--json`.
 * `stdin` is the Carry-in a call reads with `--carry-in -`. A call that cannot start is a failed Read.
 */
export async function runTraj<T>(
	context: RunContext,
	argv: string[],
	schema: z.ZodType<T>,
	stdin?: string,
): Promise<Read<T>> {
	try {
		const captured = await spawnCapture([context.binary, ...argv], { env: context.env, stdin })
		return decodeRead(argv, captured, schema)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return { argv, ok: false, error: { code: "traj_unavailable", exitCode: 1, message } }
	}
}
