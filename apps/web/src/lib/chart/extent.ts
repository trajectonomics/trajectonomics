/** The smallest and largest value of a series. */
export interface Extent {
	readonly min: number
	readonly max: number
}

/** The extent of finite numbers, or null for no values. A value that is not finite is refused. */
export function extent(values: readonly number[]): Extent | null {
	if (values.length === 0) return null
	let min = Number.POSITIVE_INFINITY
	let max = Number.NEGATIVE_INFINITY
	for (const value of values) {
		if (!Number.isFinite(value)) throw new RangeError("extent takes finite numbers")
		if (value < min) min = value
		if (value > max) max = value
	}
	return { min, max }
}
