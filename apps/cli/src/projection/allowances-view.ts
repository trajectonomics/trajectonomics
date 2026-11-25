import { z } from "zod"
import {
	type AllowanceRowView,
	type AllowanceYearView,
	allowanceRow,
	allowanceYear,
} from "./allowances-rows-view"
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

/** `traj projection allowances`: the suggestions plus the echo block (cli ADR-0030, ADR-0061). */
export type AllowancesView = Echo & {
	horizon: string
	currency: string
	labels: string[]
	step: string
	budget?: string | undefined
	minSavingBps?: number | undefined
	taxYears: AllowanceYearView[]
	allowances: AllowanceRowView[]
}

export const allowancesView: z.ZodType<AllowancesView> = z.strictObject({
	asOf: asOfField,
	engine: engineEcho,
	scenario: scenarioEcho,
	...overrideFields,
	tax: taxField,
	carryIn: carryInField,
	notes: notesField,
	horizon: dateField("The date the Projection ends at"),
	currency: z.string().describe("The Scenario's ISO 4217 currency; v1 is THB only."),
	labels: z.array(z.string()).describe("The contribution labels, in the order they were filled."),
	step: moneyField("The size of one step, as `--step` gave it"),
	budget: moneyField(
		"The most the extra contributions may add up to in each tax year, as `--budget` gave it; absent without one",
	).optional(),
	minSavingBps: z
		.number()
		.int()
		.optional()
		.describe("`--min-saving` in basis points (500 is 5%); absent without one."),
	taxYears: z
		.array(allowanceYear)
		.describe(
			"One row per tax year the Projection holds whole and the As-of has not passed, in the engine's order. A partial year is left out, with a note.",
		),
	allowances: z
		.array(allowanceRow)
		.describe("One row per tax year and label, years in order and labels in the order asked."),
})
