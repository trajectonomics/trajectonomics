import { z } from "zod"
import { ageFigures } from "./ages-view"
import { type CarryInEcho, carryInField } from "./carryin-view"
import { type FiAnswer, fiAnswer } from "./fi-view"
import { type MilestoneRow, milestoneRow } from "./milestones"
import { dateField, moneyField } from "./money"
import { type TaxYearView, taxYearsField } from "./tax-year-view"
import {
	type OverrideEcho,
	overrideEcho,
	type RunsOutView,
	runsOut,
	type ScenarioEcho,
	scenarioEcho,
} from "./view"

/** One side of a `projection compare`: its own answer, its net worth figures and its run-out. */
export type CompareSide = {
	scenario: ScenarioEcho
	overrides: OverrideEcho[]
	/** This side's `--without` removals, in command-line order (cli ADR-0056). */
	removals: string[]
	/** The items this side put on a list with --add, present only when it did (cli ADR-0062). */
	additions?: OverrideEcho[] | undefined
	/** This side's Carry-in, present only when it placed at least one record (ADR-0032). */
	carryIn?: CarryInEcho[] | undefined
	fi: FiAnswer
	taxYears: TaxYearView[]
	runOut: RunsOutView | null
	/** This side's milestones in Scenario order, present only when its Scenario declares them (cli ADR-0049). */
	milestones?: MilestoneRow[] | undefined
	netWorth: {
		final: { date: string; nominal: string; real: string }
		atAges: { age: number; nominal: string | null; real: string | null }[]
	}
}

export const compareSide: z.ZodType<CompareSide> = z.strictObject({
	scenario: scenarioEcho,
	overrides: z.array(overrideEcho).describe("The applied overrides for this side, in order."),
	removals: z
		.array(z.string())
		.describe("The list items this side took out with --without, in order."),
	additions: z
		.array(overrideEcho)
		.optional()
		.describe(
			"The items this side put on a list with --add, in order; present only when an --add was given.",
		),
	carryIn: carryInField,
	fi: fiAnswer.describe("This side's own FI answer."),
	taxYears: taxYearsField,
	runOut: runsOut.nullable().describe("The month this side runs out of money, or null."),
	milestones: z
		.array(milestoneRow)
		.optional()
		.describe(
			"This side's milestones, in Scenario order, present only when its Scenario declares Milestones.",
		),
	netWorth: z.strictObject({
		final: z.strictObject({
			date: dateField("The Projection's last row: the horizon, or the run-out month"),
			nominal: moneyField("Net worth at the Projection's end"),
			real: moneyField("The same figure in start-of-timeline terms"),
		}),
		atAges: ageFigures("Net worth at that age"),
	}),
})
