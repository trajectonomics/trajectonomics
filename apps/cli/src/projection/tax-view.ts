import type { LevyReport, Scenario, SettlementPeriod } from "@trajectonomics/core/sim"
import { ThLevyMeasureId, thLevyAssumptions } from "@trajectonomics/core/tax/th"
import { z } from "zod"
import { type AssumptionView, assumptionsField, assumptionViews } from "../tax-assumptions"
import { dateField, moneyField, moneyOf } from "./money"

/**
 * One Levy period as a Projection reports it: what the period owed, what was prepaid, and what
 * settles. Every figure is the engine's own `SettlementPeriod`; the CLI only formats it (ADR-0036).
 */
export type TaxYearView = {
	levy: string
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

type Measured = SettlementPeriod["measures"]

function measureValue(measures: Measured, id: string): number | undefined {
	return measures.find((measure) => measure.id === id)?.value
}

/**
 * The figures a tax year's reader checks by hand, read from the Levy's own Measures: the taxable
 * income and the progressive tax, and a note when the Section 48(2) minimum tax is the larger and
 * so the one charged (a reader who sees an allowance stop mattering would otherwise suspect a cap).
 */
function breakdownOf(measures: Measured, money: (value: number) => string) {
	const taxable = measureValue(measures, ThLevyMeasureId.NetTaxableIncome)
	const progressive = measureValue(measures, ThLevyMeasureId.ProgressiveTax)
	// `tax.regular` is the larger of the progressive tax and the minimum tax once its floor applies;
	// `tax.minimum` alone is the figure before the floor, so it cannot say the minimum was charged.
	const minimum = measureValue(measures, ThLevyMeasureId.RegularTax)
	const applied = progressive !== undefined && minimum !== undefined && minimum > progressive
	const notes = applied
		? [
				`The minimum tax applied: ${money(minimum)} on Section 40(2)–(8) income (Section 48(2)) is more than the progressive tax of ${money(progressive)}, so the extra allowances change nothing.`,
			]
		: []
	return {
		...(taxable === undefined ? {} : { taxableIncome: money(taxable) }),
		...(progressive === undefined ? {} : { progressiveTax: money(progressive) }),
		notes,
	}
}

/**
 * The Projection's Levy periods in the CLI's money. `owed` is the engine's own `settlement`, which
 * it already computes as due minus prepaid (ADR-0032); the CLI subtracts nothing.
 */
export function taxYearsOf(
	levies: readonly LevyReport[] | undefined,
	currency: string,
	document: Scenario,
): TaxYearView[] {
	if (levies === undefined) return []
	return levies.flatMap((levy) => {
		const rules = document.levies?.find((it) => it.id === levy.id)
		return levy.periods.map((period) => ({
			levy: levy.id,
			from: period.from,
			to: period.to,
			settlementDate: period.settlementDate,
			due: moneyOf(currency)(period.due),
			prepaid: moneyOf(currency)(period.prepaid),
			owed: moneyOf(currency)(period.settlement),
			settled: period.settled,
			partial: period.partial,
			...breakdownOf(period.measures, moneyOf(currency)),
			assumptions:
				rules === undefined ? [] : assumptionViews(thLevyAssumptions(rules, period.measures)),
		}))
	})
}
