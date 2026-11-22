/**
 * The height of each bar in pixels: its value's share of the largest value, scaled to the full height.
 * Every bar is zero when no value is above zero, so an all-zero row draws no bars.
 */
export function barHeights(values: readonly number[], height: number): number[] {
	const largest = Math.max(0, ...values)
	return values.map((value) => (largest === 0 ? 0 : (value / largest) * height))
}
