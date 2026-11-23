import { z } from "zod"
import type { RenderHint } from "../table"
import { carryInField } from "./carryin-view"
import { dateField, moneyField } from "./money"
import {
	asOfField,
	type Echo,
	engineEcho,
	notesField,
	overrideFields,
	scenarioEcho,
	taxField,
} from "./view"

/** The chance of success's Market paths and Bands, in the Scenario's currency (ADR-0011). */
export type ChancePercentileView = { level: number; value: string }

/** The net-worth Percentiles across Market paths at one annual roll-up end. */
export type ChanceBandView = { index: number; to: string; netWorth: ChancePercentileView[] }

/** How many failing Market paths first ran out in one annual roll-up. */
export type ChanceRunsOutView = { index: number; to: string; paths: number }

/** The Bands at the roll-ups a person reads, at the 10th, 50th and 90th Percentiles. */
export type ChanceTableRow = { index: number; to: string; p10: string; p50: string; p90: string }

/** The one table the human form prints: a few of the Bands, not every roll-up. */
export type ChanceTable = { name: "bands"; count: number; rows: ChanceTableRow[] }

/** The inputs the chance was computed from: the Return model, the seed and the path count. */
export type ChanceDefinitionView = { modelId: string; seed: string; paths: number }

/** `traj projection chance`: the chance of success plus the echo block (ADR-0030). */
export type ChanceView = Echo & {
	horizon: string
	currency: string
	definition: ChanceDefinitionView
	paths: number
	succeeded: number
	/** The floored share of Market paths that never run out, in basis points. */
	successBps: number
	bands: ChanceBandView[]
	runsOut: ChanceRunsOutView[]
	tables: ChanceTable[]
}

const percentile = z.strictObject({
	level: z
		.number()
		.int()
		.describe("The Percentile, from the engine's fixed set: 10, 25, 50, 75, 90."),
	value: moneyField("Closing net worth at this Percentile across Market paths"),
})

const band = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	to: dateField("The roll-up's last day"),
	netWorth: z.array(percentile).describe("The Percentiles of closing net worth, in level order."),
})

const runsOut = z.strictObject({
	index: z.number().int().describe("The roll-up in which the failing paths first ran out, from 0."),
	to: dateField("The roll-up's last day"),
	paths: z.number().int().describe("Failing Market paths whose Runs-out falls in that roll-up."),
})

const tableRow = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0."),
	to: dateField("The roll-up's last day"),
	p10: moneyField("Net worth at the 10th Percentile"),
	p50: moneyField("Net worth at the 50th Percentile"),
	p90: moneyField("Net worth at the 90th Percentile"),
})

const bandsTable = z.strictObject({
	name: z.literal("bands").describe("The Bands the human form prints."),
	count: z.number().int().describe("The number of rows."),
	rows: z.array(tableRow).describe("A few roll-ups, the first, every fifth and the last."),
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
	definition: z.strictObject({
		modelId: z.string().describe("The Return model's id, as the file states it."),
		seed: z.string().describe("The seed, as 16 lower-case hex digits."),
		paths: z.number().int().describe("The number of Market paths run."),
	}),
	paths: z.number().int().describe("The number of Market paths run."),
	succeeded: z.number().int().describe("Market paths that never run out through the horizon."),
	successBps: z
		.number()
		.int()
		.describe("The floored success share in basis points: 8730 is 87.30%."),
	bands: z.array(band).describe("One Band per annual roll-up end, in order."),
	runsOut: z.array(runsOut).describe("One row per annual roll-up, zeros included."),
	tables: z.array(bandsTable).describe("The Bands the human form prints."),
})

/** The human form: the Bands table, then the notes that state the success share and definition. */
const column = (key: string, align?: "right") =>
	align === undefined ? { key, label: key } : { key, label: key, align }

export const chanceHint: RenderHint = {
	tables: "tables",
	rows: "rows",
	columns: {
		bands: [
			column("index", "right"),
			column("to"),
			column("p10", "right"),
			column("p50", "right"),
			column("p90", "right"),
		],
	},
	note: "notes",
}
