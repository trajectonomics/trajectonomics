import { validateIntegerMinorUnits } from "../../core/money"

/** Basis points in one whole. */
const BPS = 10_000n

/**
 * The effective rate of a tax year: what it owed per ten thousand of assessable income.
 *
 * Purpose: States the rate on the figure on a salary slip, so a caller does no division of its own.
 * Math: `floor(due * 10000 / assessable)`, in BigInt so no product leaves the safe integers; a
 * negative `due` (a refund) floors toward minus infinity.
 * Units: Integer satang in; basis points out (1250 is 12.5%).
 * Throws: TaxValidationError if either amount is not a safe integer, or assessable is negative.
 *
 * @param due The tax due before Prepayment, in satang.
 * @param assessable The assessable income, in satang.
 * @returns The rate, or undefined when the assessable income is 0 and no rate exists.
 * @statute Thailand Revenue Code Section 40 (assessable income), Section 48 (tax).
 */
export function thEffectiveRateBps(due: number, assessable: number): number | undefined {
	validateIntegerMinorUnits(due, "due", { allowNegative: true })
	validateIntegerMinorUnits(assessable, "assessable")
	if (assessable === 0) return undefined
	const product = BigInt(due) * BPS
	const divisor = BigInt(assessable)
	const quotient = product / divisor
	return Number(product < 0n && product % divisor !== 0n ? quotient - 1n : quotient)
}
