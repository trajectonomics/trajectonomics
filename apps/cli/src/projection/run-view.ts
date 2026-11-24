import { z } from "zod"
import { carryInField } from "./carryin-view"
import { type AccountLifetimeView, accountLifetimesField, lifetimeFeesField } from "./lifetime-view"
import { dateField } from "./money"
import { type RoutingView, routingField } from "./routing-view"
import { type ProjectionTable, projectionTable } from "./run-table-view"
import { type TaxYearView, taxYearsField } from "./tax-view"
import {
	asOfField,
	type Echo,
	engineEcho,
	notesField,
	overrideFields,
	type RunsOutView,
	runsOut,
	scenarioEcho,
	taxField,
} from "./view"

export type { AnnualRow, MonthlyRow } from "./rows-view"
export { type ProjectionTable, projectionTable } from "./run-table-view"
export type { TaxYearView } from "./tax-view"

/** `traj projection run`: the Projection plus the echo block (ADR-0030). */
export type ProjectionRunView = Echo & {
	horizon: string
	currency: string
	/** The routing as the document states it; present only for a share, a floor or a target that keeps its value (cli ADR-0070). */
	routing?: RoutingView | undefined
	runsOut: RunsOutView | null
	taxYears: TaxYearView[]
	/** The plan's fees over the horizon, present only when an Account carries a fee (cli ADR-0067). */
	lifetimeFees?: string | undefined
	/** Each fee or payout Account's totals over the horizon, present only when one carries a fee or a payout. */
	accountLifetimes?: AccountLifetimeView[] | undefined
	tables: ProjectionTable[]
}

/** The fields of `projection run`'s result, which the replay of one Market path states too (cli ADR-0069). */
export const projectionRunFields: {
	[K in keyof Required<ProjectionRunView>]: z.ZodType<ProjectionRunView[K]>
} = {
	asOf: asOfField,
	engine: engineEcho,
	scenario: scenarioEcho,
	...overrideFields,
	tax: taxField,
	carryIn: carryInField,
	notes: notesField,
	horizon: dateField("The date the Projection ends at"),
	currency: z.string().describe("The Scenario's ISO 4217 currency; v1 is THB only."),
	routing: routingField,
	runsOut: runsOut
		.nullable()
		.describe("The month the Projection ran out of money, or null when it never does."),
	taxYears: taxYearsField,
	lifetimeFees: lifetimeFeesField,
	accountLifetimes: accountLifetimesField,
	tables: z
		.array(projectionTable)
		.describe(
			"The annual roll-up, the monthly rows when --monthly was given, the cash flow and its section totals when --breakdown was given, the loans when --liabilities was given, each Account's value when --accounts was given, what each spending rule paid when --spending was given, what the plan would leave and each cost and gift when --estate was given, what each fee Account was charged when an Account carries a fee, and the milestones when the Scenario declares them.",
		),
}

export const projectionRunView: z.ZodType<ProjectionRunView> = z.strictObject(projectionRunFields)
