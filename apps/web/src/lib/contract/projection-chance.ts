import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { projectionShape } from "./projection-shape"

/** One net-worth Percentile across Market paths at a roll-up end: its level and its money string. */
const percentile = z.strictObject({ level: integer, value: money })

/** The net-worth Percentiles at one annual roll-up end, in level order. */
const band = z.strictObject({
	index: integer,
	to: dateString,
	netWorth: z.array(percentile),
})

/** The failing Market paths whose Runs-out falls in one annual roll-up. */
const runsOut = z.strictObject({ index: integer, to: dateString, paths: integer })

/** One row of the Bands table: the 10th, 50th and 90th Percentiles at one roll-up end. */
const tableRow = z.strictObject({
	index: integer,
	to: dateString,
	p10: money,
	p50: money,
	p90: money,
})

/** The Bands table the human form prints: a few roll-ups, not every one. */
const bandsTable = z.strictObject({
	name: z.literal("bands"),
	count: integer,
	rows: z.array(tableRow),
})

/** `traj projection chance --json`: the success share of one Scenario over seeded Market paths. */
export const projectionChance = z.strictObject({
	...projectionShape,
	definition: z.strictObject({ modelId: z.string(), seed: z.string(), paths: integer }),
	paths: integer,
	succeeded: integer,
	successBps: integer,
	bands: z.array(band),
	runsOut: z.array(runsOut),
	tables: z.array(bandsTable),
})
export type ProjectionChance = z.infer<typeof projectionChance>
