import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { planReturnModel } from "./projection-chance"
import { projectionRun } from "./projection-run"

/** Each Account's market return over one annual roll-up of the path, in basis points. */
const rollupReturns = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	// Present only when the Return model has an inflation factor (cli ADR-0085).
	inflationBps: integer.optional(),
	accounts: z.array(z.strictObject({ account: z.string(), returnBps: integer })),
})

/**
 * `traj projection path --json`: the Projection of one seeded Market path, in `projection run`'s shape,
 * plus the run it is a path of, as `projection chance` echoes it, and the returns it drew (cli ADR-0069).
 */
export const projectionPath = projectionRun.extend({
	index: integer,
	definition: z.strictObject({
		modelId: z.string(),
		seed: z.string(),
		paths: integer,
		modelHash: z.string(),
	}),
	returnModel: planReturnModel.optional(),
	returns: z.array(rollupReturns),
})
export type ProjectionPath = z.infer<typeof projectionPath>
