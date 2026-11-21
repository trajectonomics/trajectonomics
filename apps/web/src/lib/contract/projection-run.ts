import { z } from "zod"
import { dateString } from "./date"
import { money } from "./money"
import { projectionShape } from "./projection-shape"
import { projectionTables } from "./projection-tables"
import { taxYear } from "./tax-year"

/** `traj projection run --json`: the Baseline projected through one Scenario, year by year. */
export const projectionRun = z.strictObject({
	...projectionShape,
	runsOut: z.strictObject({ date: dateString, unmet: money }).nullable(),
	taxYears: z.array(taxYear),
	tables: projectionTables,
})
export type ProjectionRun = z.infer<typeof projectionRun>
