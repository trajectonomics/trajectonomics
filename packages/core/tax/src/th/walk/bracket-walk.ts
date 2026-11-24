import { evaluateBrackets, type TaxBracket } from "../../core/brackets"
import { validateIntegerMinorUnits } from "../../core/money"
import { rateBigFraction } from "../../core/money/ratio"
import { TH_2026_PARAMETERS } from "../parameters"
import { toSatang } from "../units"

/** Basis points in one whole (a rate of 1). */
const BPS = 10_000n

/**
 * One progressive bracket as a Thai Levy states it in a tax year's walk.
 *
 * Purpose: Shows how much of the taxable income falls inside a bracket and the tax it gives.
 * Math: `tax` is `round_half_up(income * rate)`, the same slice the Levy's Measures emit.
 * Units: Integer satang; `rateBps` is basis points (500 is 5%).
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 48(1).
 */
export interface ThBracketWalkSlice {
	/** The bracket's lower edge: income above it is taxed at this bracket's rate. */
	readonly from: number
	/** The bracket's upper edge, or null for the top bracket. */
	readonly upTo: number | null
	/** The bracket's rate in basis points. */
	readonly rateBps: number
	/** The part of the taxable income inside the bracket. */
	readonly income: number
	/** The tax that part gives. */
	readonly tax: number
}

/**
 * Where a taxable income sits in the Section 48(1) schedule.
 *
 * Purpose: Answers which bracket the last baht is in and how much room is left in it.
 * Math: See {@link thBracketWalk}.
 * Units: Integer satang; `marginalRateBps` is basis points.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 48(1).
 */
export interface ThBracketWalk {
	/** One slice per bracket of the schedule, lowest first, including those with no income. */
	readonly slices: readonly ThBracketWalkSlice[]
	/** The sum of the slices' tax: the progressive tax. */
	readonly progressiveTax: number
	/** The rate of the bracket the last satang of the taxable income falls in. */
	readonly marginalRateBps: number
	/** Taxable income left before the next bracket starts; absent in the top bracket. */
	readonly toNextBracket?: number
}

function bps(rate: number): number {
	const { num, den } = rateBigFraction(rate)
	return Number((num * BPS) / den)
}

/**
 * Slices a taxable income across a Thai bracket schedule.
 *
 * Purpose: States the bracket arithmetic once, in the package that holds the brackets, so a
 * caller formats figures and does no tax arithmetic of its own.
 * Math: Slices come from `evaluateBrackets`, whose tax per slice the Levy's Measures reproduce
 * exactly. The marginal bracket is the last one with income in it (the first, for no income): an
 * income exactly on an edge is still in the bracket below it, with nothing left (`toNextBracket`
 * 0). `toNextBracket = upTo - taxableIncome`.
 * Units: Integer satang in and out; the bracket table is in THB major units, as parameters hold it.
 * Throws: TaxValidationError if the income is negative, non-integer or unsafe, or a bracket is invalid.
 *
 * @param taxableIncome Net taxable income in satang (the Levy's `taxable.income`).
 * @param brackets The schedule the Levy was emitted from.
 * @statute Thailand Revenue Code Section 48(1).
 */
export function thBracketWalk(
	taxableIncome: number,
	brackets: readonly TaxBracket[] = TH_2026_PARAMETERS.brackets,
): ThBracketWalk {
	validateIntegerMinorUnits(taxableIncome, "taxableIncome")
	const satang = brackets.map((b) => ({
		upTo: b.upTo === null ? null : toSatang(b.upTo),
		rate: b.rate,
	}))
	const result = evaluateBrackets(taxableIncome, satang)
	const slices = result.slices.map((slice) => ({
		from: slice.lowerBound,
		upTo: slice.upperBound,
		rateBps: bps(slice.rate),
		income: slice.taxableAmount,
		tax: slice.tax,
	}))
	const last = slices.filter((slice) => slice.income > 0).pop() ?? slices[0]
	const upTo = last?.upTo ?? null
	return {
		slices,
		progressiveTax: result.totalTax,
		marginalRateBps: last?.rateBps ?? 0,
		...(upTo === null ? {} : { toNextBracket: upTo - taxableIncome }),
	}
}
