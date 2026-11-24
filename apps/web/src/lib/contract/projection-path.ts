import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { projectionShape } from "./projection-shape"
import { projectionTables } from "./projection-tables"
import { taxYear } from "./tax-year"

/** What `--return-model plan` built the model from (cli ADR-0068). Present only with `plan`. */
const planReturnModel = z.strictObject({
	source: z.literal("plan"),
	buckets: integer,
	accounts: z.array(z.strictObject({ id: z.string(), rate: integer, volatility: integer })),
})

/** Each Account's market return over one annual roll-up of the path, in basis points. */
const rollupReturns = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	accounts: z.array(z.strictObject({ account: z.string(), returnBps: integer })),
})

/**
 * `traj projection path --json`: the Projection of one seeded Market path, in `projection run`'s shape,
 * plus the run it is a path of and the returns it drew (cli ADR-0069).
 */
export const projectionPath = z.strictObject({
	...projectionShape,
	runsOut: z.strictObject({ date: dateString, unmet: money }).nullable(),
	taxYears: z.array(taxYear),
	tables: projectionTables,
	index: integer,
	paths: integer,
	seed: z.string(),
	modelId: z.string(),
	returnModel: planReturnModel.optional(),
	returns: z.array(rollupReturns),
})
export type ProjectionPath = z.infer<typeof projectionPath>
