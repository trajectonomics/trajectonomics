/**
 * Each value's share of the total, from non-negative numbers. The shares sum to 1, or are all 0
 * when every value is 0. Multiply by a width to get the width of a composition bar's segment.
 */
export function shares(values: readonly number[]): number[] {
	if (values.some((value) => !Number.isFinite(value) || value < 0)) {
		throw new RangeError("shares takes finite, non-negative numbers")
	}
	const total = values.reduce((sum, value) => sum + value, 0)
	return values.map((value) => (total === 0 ? 0 : value / total))
}
