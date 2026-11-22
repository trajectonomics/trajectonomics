import { rateBigFraction } from "./ratio"

/** Exact decimal value of a number as a BigInt fraction, not reduced. */
interface DecimalFraction {
	readonly num: bigint
	readonly den: bigint
}

/** Satang per baht, as an exact BigInt: the minor-unit scale of THB. */
const SATANG_PER_BAHT = 100n

/**
 * Floors an exact fraction toward negative infinity, as `Math.floor` does.
 *
 * Purpose: Shared integer floor for both the whole-baht and the satang variants.
 * Math: `floor(numerator / denominator)` for a positive denominator.
 * Units: Dimensionless integers.
 */
function floorFraction(numerator: bigint, denominator: bigint): bigint {
	return numerator >= 0n ? numerator / denominator : (numerator - (denominator - 1n)) / denominator
}

/**
 * Exact decimal expansion of a finite amount, read from its shortest round-trip text.
 *
 * Purpose: Lets the floor use the amount as written (`180.5` stays `1805/10`), without rounding it to satang.
 * Math: Expands the `String(value)` mantissa and exponent into `digits * 10^exponent` as a BigInt fraction.
 * Units: Dimensionless; the caller supplies major units.
 */
function decimalFraction(value: number): DecimalFraction {
	const [mantissa = "0", exponentText = "0"] = String(value).split("e")
	const [whole = "0", fraction = ""] = mantissa.split(".")
	const exponent = Number(exponentText) - fraction.length
	const digits = BigInt(`${whole}${fraction}`)
	if (exponent >= 0) return { num: digits * 10n ** BigInt(exponent), den: 1n }
	return { num: digits, den: 10n ** BigInt(-exponent) }
}

/**
 * Floors `amount × rate` to a whole unit, computed exactly.
 *
 * Purpose: Replaces `Math.floor(amount * rate)` on major units. No Thai deduction floors to the whole baht any
 * more (owner ruling 2026-11-22, #52); those stages use {@link floorByRateToSatang}. The binary product can land just
 * below an integer (180 × 0.35 gives 62.999…, so 62), and that error would change a statutory deduction.
 * Math: `floor(amount × rate)` with the amount's exact decimal value and the rate's exact fraction,
 * in BigInt. Floors toward negative infinity, as `Math.floor` does.
 * Units: Major units in, whole major units out; no rounding to satang happens first, so a sub-satang
 * amount is floored at its written value.
 * Throws: TaxValidationError (from the rate) if the rate is NaN, non-finite, or outside [0, 1].
 * A non-finite amount returns `Math.floor(amount * rate)`, so NaN and infinities pass through unchanged.
 *
 * @param amount Amount in major units.
 * @param rate Statutory rate ratio (e.g. 0.5 for 50%).
 * @param field Diagnostic field name reported for an invalid rate.
 * @statute Jurisdiction-neutral arithmetic; Thailand Revenue Code Sections 40(1)–(8) deductions are the consumers.
 */
export function floorByRate(amount: number, rate: number, field = "rate"): number {
	if (!Number.isFinite(amount)) return Math.floor(amount * rate)
	const r = rateBigFraction(rate, field)
	const a = decimalFraction(amount)
	return Number(floorFraction(a.num * r.num, a.den * r.den)) + 0
}

/**
 * Floors `amount × rate` to the satang (0.01 baht), computed exactly.
 *
 * Purpose: Statutory percentage deductions and donation caps floor to the satang, not the whole baht,
 * so a larger income never lowers tax (owner ruling 2026-11-22, trajectonomics/trajectonomics#52).
 * Math: `floor(100 × amount × rate) / 100` with the amount's exact decimal value and the rate's exact
 * fraction, in BigInt. Floors toward negative infinity, as `Math.floor` does.
 * Units: THB major units in, THB major units out with satang precision (a whole multiple of 0.01).
 * Throws: TaxValidationError (from the rate) if the rate is NaN, non-finite, or outside [0, 1].
 * A non-finite amount returns `Math.floor(amount * rate)`, so NaN and infinities pass through unchanged.
 *
 * @param amount Amount in major units.
 * @param rate Statutory rate ratio (e.g. 0.6 for 60%).
 * @param field Diagnostic field name reported for an invalid rate.
 * @statute Thailand Revenue Code Sections 40(1)–(8) deductions and Section 47(7) donation caps.
 */
export function floorByRateToSatang(amount: number, rate: number, field = "rate"): number {
	if (!Number.isFinite(amount)) return Math.floor(amount * rate)
	const r = rateBigFraction(rate, field)
	const a = decimalFraction(amount)
	const satang = floorFraction(a.num * r.num * SATANG_PER_BAHT, a.den * r.den)
	return Number(satang) / 100 + 0
}
