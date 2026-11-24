import type { SettlementPeriod } from "@trajectonomics/core/sim"
import { ThLevyMeasureId } from "@trajectonomics/core/tax/th"
import { taxWalkOf } from "./tax-walk"
import type { TaxWalkFields } from "./tax-walk-schema"

type Measured = SettlementPeriod["measures"]

function measureValue(measures: Measured, id: string): number | undefined {
	return measures.find((measure) => measure.id === id)?.value
}

/**
 * The figures a tax year's reader checks by hand, read from the Levy's own Measures: the taxable
 * income and the progressive tax, and a note when the Section 48(2) minimum tax is the larger and
 * so the one charged (a reader who sees an allowance stop mattering would otherwise suspect a cap).
 */
export function breakdownOf(
	measures: Measured,
	money: (value: number) => string,
	due: number,
): TaxWalkFields & { taxableIncome?: string; progressiveTax?: string; notes: string[] } {
	const taxable = measureValue(measures, ThLevyMeasureId.NetTaxableIncome)
	const progressive = measureValue(measures, ThLevyMeasureId.ProgressiveTax)
	// `tax.regular` is the larger of the progressive tax and the minimum tax once its floor applies;
	// `tax.minimum` alone is the figure before the floor, so it cannot say the minimum was charged.
	const minimum = measureValue(measures, ThLevyMeasureId.RegularTax)
	const applied = progressive !== undefined && minimum !== undefined && minimum > progressive
	const notes: string[] = applied
		? [
				`The minimum tax applied: ${money(minimum)} on Section 40(2)–(8) income (Section 48(2)) is more than the progressive tax of ${money(progressive)}, so the extra allowances change nothing.`,
			]
		: []
	const walk = taxWalkOf(measures, due, money)
	if (applied && walk.brackets !== undefined) {
		notes.push(
			`The brackets do not set the tax this year: the minimum tax does. The brackets and the marginal rate describe the progressive tax of ${money(progressive)} only.`,
		)
	}
	if (
		walk.walk !== undefined &&
		walk.brackets === undefined &&
		progressive !== undefined &&
		taxable !== undefined
	) {
		notes.push(
			`The brackets are not stated: this Levy's progressive tax of ${money(progressive)} is not what the Section 48(1) schedule gives on ${money(taxable)} of taxable income, so it was emitted from another table.`,
		)
	}
	return {
		...(taxable === undefined ? {} : { taxableIncome: money(taxable) }),
		...(progressive === undefined ? {} : { progressiveTax: money(progressive) }),
		...walk,
		notes,
	}
}
