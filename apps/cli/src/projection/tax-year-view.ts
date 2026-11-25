import { z } from "zod"
import { type AssumptionView, assumptionsField } from "../tax-assumptions"
import { dateField, moneyField } from "./money"
import type { TaxWalkFields } from "./tax-walk-schema"
import { taxWalkShape } from "./tax-walk-schema"

/**
 * One Levy period as a Projection reports it: what the period owed, what was prepaid, and what
 * settles. Every figure is the engine's own `SettlementPeriod`; the CLI only formats it (ADR-0036).
 */
export type TaxYearView = TaxWalkFields & {
	levy: string
	/** The Filer whose Return this Levy files, for a separate filing (cli ADR-0075). */
	filer?: string | undefined
	from: string
	to: string
	settlementDate: string
	due: string
	prepaid: string
	owed: string
	settled: boolean
	partial: boolean
	taxableIncome?: string | undefined
	progressiveTax?: string | undefined
	notes: string[]
	assumptions: AssumptionView[]
}

export const taxYearView: z.ZodType<TaxYearView> = z.strictObject({
	levy: z.string().describe("The Levy's id, as the Scenario spells it."),
	filer: z
		.string()
		.optional()
		.describe(
			"The Filer whose Return this Levy files, for a separate filing (cli ADR-0075); absent when the plan keeps one Return.",
		),
	from: dateField("The period's first day"),
	to: dateField("The period's last day"),
	settlementDate: dateField("The day the amount owed is due to be paid"),
	due: moneyField("The tax the period owes before any Prepayment"),
	prepaid: moneyField("The tax already paid at source in this period"),
	owed: moneyField(
		"The tax still to pay after Prepayment: due minus prepaid; a negative figure is a refund",
	),
	settled: z
		.boolean()
		.describe(
			"Whether the settlement date falls inside the Projection, so its charge is included.",
		),
	partial: z
		.boolean()
		.describe("Whether the Projection ended before the period did, so the period is incomplete."),
	taxableIncome: moneyField(
		"The income the progressive brackets were applied to, after expenses and allowances; absent when the Levy does not report it",
	).optional(),
	progressiveTax: moneyField(
		"The tax the progressive brackets gave on that income; absent when the Levy does not report it",
	).optional(),
	...taxWalkShape,
	notes: z
		.array(z.string())
		.describe("What a reader needs to check the figure, such as the minimum tax applying."),
	assumptions: assumptionsField,
})

/** One entry per Levy period, in the engine's own Levy and period order. */
export const taxYearsField: z.ZodType<TaxYearView[]> = z
	.array(taxYearView)
	.describe(
		"One entry per Levy settlement period: what each tax year owed, was prepaid, and settles. Empty when the Scenario holds no Levy.",
	)
