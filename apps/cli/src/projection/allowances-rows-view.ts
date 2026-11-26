import { z } from "zod"
import { type AssumptionView, assumptionsField } from "../tax-assumptions"
import { type AllowanceFlow, allowanceFlow } from "./allowances-flow-view"
import { dateField, moneyField } from "./money"

/** Why a label's steps stopped: the engine's closed set (sim ADR-0022), never a sentence. */
export const STOPPED_BY = ["noSaving", "belowMinSaving", "budget"] as const
export type StoppedBy = (typeof STOPPED_BY)[number]

/** One row per tax year the Projection holds whole: what it owes now and with every suggestion. */
export type AllowanceYearView = {
	levy: string
	/** The Filer whose Return this Levy files, for a separate filing (cli ADR-0075). */
	filer?: string | undefined
	from: string
	to: string
	settlementDate: string
	dueBefore: string
	dueAfter: string
	saving: string
	assumptions: AssumptionView[]
}

/** One row per tax year and label: what is planned, what more fits, and why it stopped. */
export type AllowanceRowView = {
	levy: string
	/** The Filer whose Return this Levy files, for a separate filing (cli ADR-0075). */
	filer?: string | undefined
	from: string
	to: string
	label: string
	planned: string
	extra: string
	saving: string
	stoppedBy: StoppedBy
	flow?: AllowanceFlow | undefined
	hint?: string | undefined
}

export const allowanceYear: z.ZodType<AllowanceYearView> = z.strictObject({
	levy: z.string().describe("The Levy's id, as the Scenario spells it."),
	filer: z
		.string()
		.optional()
		.describe(
			"The Filer whose Return this Levy files, for a separate filing (cli ADR-0075); absent when the plan keeps one Return.",
		),
	from: dateField("The tax year's first day"),
	to: dateField("The tax year's last day"),
	settlementDate: dateField("The day the amount owed is due to be paid"),
	dueBefore: moneyField("The tax the year owes with the plan as it stands"),
	dueAfter: moneyField("The tax the year would owe with every suggested extra"),
	saving: moneyField(
		"The tax the suggestions save: the sum of the year's `allowances` savings, which equals dueBefore minus dueAfter",
	),
	assumptions: assumptionsField,
})

export const allowanceRow: z.ZodType<AllowanceRowView> = z.strictObject({
	levy: z.string().describe("The Levy's id."),
	filer: z
		.string()
		.optional()
		.describe(
			"The Filer whose Return this Levy files, for a separate filing (cli ADR-0075); absent when the plan keeps one Return.",
		),
	from: dateField("The tax year's first day"),
	to: dateField("The tax year's last day"),
	label: z.string().describe("The contribution Tally label, as `--labels` names it."),
	planned: moneyField("What the plan already contributes under this label in the year"),
	extra: moneyField(
		"What more would still lower the tax, in whole steps and never past a cap; 0.00 when none would",
	),
	saving: moneyField("The tax this label's extra saves, after the labels before it filled"),
	stoppedBy: z
		.enum(STOPPED_BY)
		.describe(
			"Why the next step was not taken: `noSaving` (the allowance's cap is reached or one more step saves nothing), `belowMinSaving` (a step would save less than --min-saving) or `budget` (the next step does not fit --budget).",
		),
	flow: allowanceFlow
		.optional()
		.describe("The contribution that applies this row; absent when `extra` is 0.00."),
	hint: z
		.string()
		.optional()
		.describe("What to do first when `flow` has no `target`; absent otherwise."),
})
