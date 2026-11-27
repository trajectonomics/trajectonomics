import { z } from "zod"
import { carryInField } from "./carryin-view"
import { band, bandsTable, runsOut } from "./chance-band-view"
import { type ChanceMilestoneView, milestonesField } from "./chance-milestones-view"
import {
	type ChanceOutcomeView,
	type ChanceRepresentativeView,
	outcomesField,
	representativeField,
} from "./chance-outcomes-view"
import { type PlanModelView, planModelField } from "./chance-plan-view"
import {
	type ChanceLowestYearView,
	type ChancePercentileView,
	type ChanceSpendingBandView,
	type ChanceSpendingTable,
	type ChanceTableRow,
	lowestYearField,
	spendingBandField,
} from "./chance-spending-view"
import { dateField } from "./money"
import {
	asOfField,
	type Echo,
	engineEcho,
	notesField,
	overrideFields,
	scenarioEcho,
	taxField,
} from "./view"

/** The net-worth Percentiles across Market paths at one annual roll-up end. */
export type ChanceBandView = { index: number; to: string; netWorth: ChancePercentileView[] }

/** How many failing Market paths first ran out in one annual roll-up. */
export type ChanceRunsOutView = { index: number; to: string; paths: number }

/**
 * The tables the human form prints: a few of the Bands, not every roll-up, and for a plan with a
 * spending rule a few of its spending Bands and the lowest year (cli ADR-0063).
 */
export type ChanceTable =
	| { name: "bands"; count: number; rows: ChanceTableRow[] }
	| ChanceSpendingTable

/** What the sentence stating the success share begins with: the human form reads it first (cli ADR-0027). */
export const SUCCESS_NOTE_PREFIX = "The plan holds to "

/** The inputs the chance was computed from: the Return model, the seed and the path count. */
export type ChanceDefinitionView = {
	modelId: string
	seed: string
	paths: number
	modelHash: string
}

/** `traj projection chance`: the chance of success plus the echo block (ADR-0030). */
export type ChanceView = Echo & {
	horizon: string
	currency: string
	definition: ChanceDefinitionView
	/** Present only for `--return-model plan`: the inputs the model was built from (cli ADR-0068). */
	returnModel?: PlanModelView | undefined
	paths: number
	succeeded: number
	/** The floored share of Market paths that never run out, in basis points. */
	successBps: number
	bands: ChanceBandView[]
	runsOut: ChanceRunsOutView[]
	/** Present only when the plan has a spending rule Flow. */
	spendingBands?: ChanceSpendingBandView[] | undefined
	/** Present only when the plan has a spending rule Flow. */
	lowestYearSpending?: ChanceLowestYearView | undefined
	/** Present only with `--outcomes`: each Market path's result (cli ADR-0069). */
	outcomes?: ChanceOutcomeView[] | undefined
	/** Present only with `--outcomes`: the paths worth opening first. */
	representative?: ChanceRepresentativeView | undefined
	/** Present only with `--milestone-dates`: when each Milestone fired across the paths. */
	milestones?: ChanceMilestoneView[] | undefined
	tables: ChanceTable[]
}

/** The run a chance or a path names: the Return model's id, the seed and the path count. */
export const chanceDefinition: z.ZodType<ChanceDefinitionView> = z.strictObject({
	modelId: z.string().describe("The Return model's id, as the file states it."),
	seed: z.string().describe("The seed, as 16 lower-case hex digits."),
	paths: z.number().int().describe("The number of Market paths run."),
	modelHash: z
		.string()
		.describe(
			"The content hash of the Return model document the paths were drawn from, as jcs1:sha256:<hex>.",
		),
})

export const chanceView: z.ZodType<ChanceView> = z.strictObject({
	asOf: asOfField,
	engine: engineEcho,
	scenario: scenarioEcho,
	...overrideFields,
	tax: taxField,
	carryIn: carryInField,
	notes: notesField,
	horizon: dateField("The date the Projection ends at"),
	currency: z.string().describe("The Scenario's ISO 4217 currency; v1 is THB only."),
	definition: chanceDefinition,
	returnModel: planModelField,
	paths: z.number().int().describe("The number of Market paths run."),
	succeeded: z.number().int().describe("Market paths that never run out through the horizon."),
	successBps: z
		.number()
		.int()
		.describe("The floored success share in basis points: 8730 is 87.30%."),
	bands: z.array(band).describe("One Band per annual roll-up end, in order."),
	runsOut: z.array(runsOut).describe("One row per annual roll-up, zeros included."),
	spendingBands: spendingBandField,
	lowestYearSpending: lowestYearField,
	outcomes: outcomesField,
	representative: representativeField,
	milestones: milestonesField,
	tables: z.array(bandsTable).describe("The Bands the human form prints."),
})
