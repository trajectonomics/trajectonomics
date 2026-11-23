import type { z } from "zod"
import type { Read } from "../src/lib/contract"
import { carryInFor, type PlannedRead } from "../src/lib/snapshot"
import { type RunContext, runTraj } from "./run-traj"

/** One planned read, run with its schema, taking the Carry-in records its Scenarios name. */
export async function runPlanned<T>(
	context: RunContext,
	planned: PlannedRead,
	schema: z.ZodType<T>,
	records: readonly unknown[],
): Promise<Read<T>> {
	const stdin =
		planned.carryInFor.length > 0
			? JSON.stringify(carryInFor(records, planned.carryInFor))
			: undefined
	return runTraj(context, [...planned.argv], schema, stdin)
}
