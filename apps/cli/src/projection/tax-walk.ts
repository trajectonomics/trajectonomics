import type { SettlementPeriod } from "@trajectonomics/core/sim"
import { ThLevyMeasureId, thBracketWalk, thEffectiveRateBps } from "@trajectonomics/core/tax/th"
import type { TaxWalkFields } from "./tax-walk-schema"

type Measured = SettlementPeriod["measures"]

function measureOf(measures: Measured, id: string): number | undefined {
	return measures.find((measure) => measure.id === id)?.value
}

/**
 * The walk, brackets and rates of one tax year. Every figure is the Levy's own Measure or a result
 * of `@trajectonomics/core/tax/th`'s bracket functions; the CLI formats and subtracts nothing
 * (ADR-0036). A Levy that lacks one of the four walk Measures was not emitted by the CLI and gets
 * nothing, and so does one whose progressive tax is not the schedule's (a hand-written table).
 */
export function taxWalkOf(
	measures: Measured,
	due: number,
	money: (minor: number) => string,
): TaxWalkFields {
	const assessable = measureOf(measures, ThLevyMeasureId.AssessableTotal)
	const expenses = measureOf(measures, ThLevyMeasureId.ExpensesTotal)
	const allowances = measureOf(measures, ThLevyMeasureId.AllowancesTotal)
	const taxable = measureOf(measures, ThLevyMeasureId.NetTaxableIncome)
	const progressive = measureOf(measures, ThLevyMeasureId.ProgressiveTax)
	if (
		assessable === undefined ||
		expenses === undefined ||
		allowances === undefined ||
		taxable === undefined ||
		progressive === undefined
	) {
		return {}
	}
	const walk = {
		assessable: money(assessable),
		expenses: money(expenses),
		allowances: money(allowances),
		taxableIncome: money(taxable),
	}
	const bracketWalk = thBracketWalk(taxable)
	if (bracketWalk.progressiveTax !== progressive) return { walk }
	const effective = thEffectiveRateBps(due, assessable)
	return {
		walk,
		brackets: bracketWalk.slices.map((slice) => ({
			from: money(slice.from),
			upTo: slice.upTo === null ? null : money(slice.upTo),
			rateBps: slice.rateBps,
			income: money(slice.income),
			tax: money(slice.tax),
		})),
		marginalRateBps: bracketWalk.marginalRateBps,
		...(bracketWalk.toNextBracket === undefined
			? {}
			: { toNextBracket: money(bracketWalk.toNextBracket) }),
		...(effective === undefined ? {} : { effectiveRateBps: effective }),
	}
}
