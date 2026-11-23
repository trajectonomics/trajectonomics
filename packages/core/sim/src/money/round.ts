/** Half-up rounding of a non-negative integer ratio. */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
	if (numerator < 0n) throw new RangeError("roundHalfUp expects a non-negative numerator")
	if (denominator <= 0n) throw new RangeError("roundHalfUp expects a positive denominator")
	// One division: with remainder `r`, `(2n + d) / 2d` is the quotient plus 1 exactly when `2r >= d`.
	return (2n * numerator + denominator) / (2n * denominator)
}
