import { z } from "zod"
import { carryInField } from "./carryin-view"
import { type MilestoneRow, milestoneRow } from "./milestones"
import { dateField } from "./money"
import { type AnnualRow, annualRow, type MonthlyRow, monthlyRow } from "./rows-view"
import { type TaxYearView, taxYearsField } from "./tax-view"
import {
	asOfField,
	type Echo,
	engineEcho,
	notesField,
	overridesField,
	type RunsOutView,
	runsOut,
	scenarioEcho,
	taxField,
} from "./view"

export type { AnnualRow, MonthlyRow } from "./rows-view"
export type { TaxYearView } from "./tax-view"

/** The Projection's annual roll-up, its monthly rows with `--monthly`, and its milestones (cli ADR-0049). */
export type ProjectionTable =
	| { name: "annual"; count: number; rows: AnnualRow[] }
	| { name: "monthly"; count: number; rows: MonthlyRow[] }
	| { name: "milestones"; count: number; rows: MilestoneRow[] }

/** `traj projection run`: the Projection plus the echo block (ADR-0030). */
export type ProjectionRunView = Echo & {
	horizon: string
	currency: string
	runsOut: RunsOutView | null
	taxYears: TaxYearView[]
	tables: ProjectionTable[]
}

export const projectionTable: z.ZodType<ProjectionTable> = z.union([
	z.strictObject({
		name: z.literal("annual").describe("The engine's annual roll-up."),
		count: z.number().int().describe("The number of roll-up rows."),
		rows: z.array(annualRow).describe("One row per year, in order."),
	}),
	z.strictObject({
		name: z.literal("monthly").describe("The monthly rows, present only with --monthly."),
		count: z.number().int().describe("The number of monthly rows."),
		rows: z.array(monthlyRow).describe("One row per month, in order."),
	}),
	z.strictObject({
		name: z
			.literal("milestones")
			.describe("Each Milestone's fire date, present only when the Scenario declares Milestones."),
		count: z.number().int().describe("The number of Milestones."),
		rows: z.array(milestoneRow).describe("One row per Milestone, in Scenario order."),
	}),
])

export const projectionRunView: z.ZodType<ProjectionRunView> = z.strictObject({
	asOf: asOfField,
	engine: engineEcho,
	scenario: scenarioEcho,
	overrides: overridesField,
	tax: taxField,
	carryIn: carryInField,
	notes: notesField,
	horizon: dateField("The date the Projection ends at"),
	currency: z.string().describe("The Scenario's ISO 4217 currency; v1 is THB only."),
	runsOut: runsOut
		.nullable()
		.describe("The month the Projection ran out of money, or null when it never does."),
	taxYears: taxYearsField,
	tables: z
		.array(projectionTable)
		.describe(
			"The annual roll-up, the monthly rows when --monthly was given, and the milestones when the Scenario declares them.",
		),
})
