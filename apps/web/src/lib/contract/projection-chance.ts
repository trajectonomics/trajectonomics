import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { chanceMilestones } from "./projection-chance-milestones"
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
	// Present only when the Return model has an inflation factor (cli ADR-0085).
	p50Real: money.optional(),
	p90: money,
})

/** The spending Percentiles at one annual roll-up end, in level order (cli ADR-0063). */
const spendingBand = z.strictObject({
	index: integer,
	to: dateString,
	spending: z.array(percentile),
})

/**
 * The Percentiles, across the Market paths that have one, of each path's lowest whole year of
 * spending (cli ADR-0063). `paths` says how many have one; the Percentiles are empty when none does.
 */
const lowestYear = z.strictObject({ paths: integer, spending: z.array(percentile) })

/** The lowest-year row the human form prints: the number of paths and the five Percentiles. */
const lowestYearRow = z.strictObject({
	paths: integer,
	p10: money,
	p25: money,
	p50: money,
	p75: money,
	p90: money,
})

/**
 * The tables the human form prints: a few Bands, not every roll-up, and for a plan with a spending
 * rule a few of its spending Bands and the lowest year.
 */
const chanceTable = z.discriminatedUnion("name", [
	z.strictObject({ name: z.literal("bands"), count: integer, rows: z.array(tableRow) }),
	z.strictObject({ name: z.literal("spendingBands"), count: integer, rows: z.array(tableRow) }),
	z.strictObject({
		name: z.literal("lowestYearSpending"),
		count: integer,
		rows: z.array(lowestYearRow),
	}),
])

/**
 * What `--return-model plan` built the model from (cli ADR-0068): the bucket count and each asset
 * Account that swings, with its `rate` and `volatility` in basis points. Present only with `plan`.
 */
export const planReturnModel = z.strictObject({
	source: z.literal("plan"),
	buckets: integer,
	accounts: z.array(z.strictObject({ id: z.string(), rate: integer, volatility: integer })),
	// Present only when the Scenario states an `inflationVolatility` above 0 (cli ADR-0085).
	inflation: z.strictObject({ rate: integer, volatility: integer }).optional(),
})

/**
 * One Market path's result, with `--outcomes` (cli ADR-0069): closing and lowest net worth, the first
 * day of the roll-up it was lowest in, and when it ran out, or null.
 */
const pathOutcome = z.strictObject({
	index: integer,
	closingNetWorth: money,
	lowestNetWorth: money,
	lowestYear: dateString,
	runsOut: z.strictObject({ date: dateString, unmet: money }).nullable(),
	milestones: z.record(z.string(), dateString).optional(),
})

/** The path indexes to open first, with `--outcomes`: the 10th, 50th and 90th Percentile, the earliest to run out, the lowest. */
const representative = z.strictObject({
	p10: integer,
	p50: integer,
	p90: integer,
	earliestRunsOut: integer.nullable(),
	lowest: integer,
})

/**
 * `traj projection chance --json`: the success share of one Scenario over seeded Market paths and,
 * for a plan with a spending rule, what the rule pays across them.
 */
export const projectionChance = z.strictObject({
	...projectionShape,
	definition: z.strictObject({
		modelId: z.string(),
		seed: z.string(),
		paths: integer,
		modelHash: z.string(),
	}),
	paths: integer,
	succeeded: integer,
	successBps: integer,
	bands: z.array(band),
	// Present only when the Return model has an inflation factor (cli ADR-0085).
	realBands: z.array(band).optional(),
	runsOut: z.array(runsOut),
	// Present only when the Scenario has a spending rule Flow (cli ADR-0063).
	spendingBands: z.array(spendingBand).optional(),
	lowestYearSpending: lowestYear.optional(),
	tables: z.array(chanceTable),
	returnModel: planReturnModel.optional(),
	// Present only with --outcomes (cli ADR-0069).
	outcomes: z.array(pathOutcome).optional(),
	representative: representative.optional(),
	// Present only with --milestone-dates (cli ADR-0081).
	milestones: chanceMilestones.optional(),
})
export type ProjectionChance = z.infer<typeof projectionChance>
