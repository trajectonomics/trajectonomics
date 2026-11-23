const SHIFT = 160n
const ONE = 1n << SHIFT
const HALF = ONE >> 1n
/** Amounts below this take the scaled path; a larger one is rounded exactly. */
const LIMIT = 1n << 96n

/** `floor(2^160 * numerator / denominator)`: the ratio as a fixed-point number, computed once per ratio. */
export function scaledRatio(numerator: bigint, denominator: bigint): bigint {
	return (numerator << SHIFT) / denominator
}

/**
 * `roundHalfUp(amount * numerator, denominator)` through the fixed-point `scaled` ratio of the two,
 * which multiplies by a few words instead of dividing by a huge denominator. `scaled` undershoots
 * the ratio by less than 2^-160, so the product undershoots the exact one by less than `amount`;
 * when that could carry across a rounding boundary, `exact` decides, so the result is always the
 * exact one.
 */
export function roundScaled(amount: bigint, scaled: bigint, exact: () => bigint): bigint {
	if (amount < 0n || amount >= LIMIT) return exact()
	const shifted = amount * scaled + HALF
	if ((shifted & (ONE - 1n)) + amount >= ONE) return exact()
	return shifted >> SHIFT
}
