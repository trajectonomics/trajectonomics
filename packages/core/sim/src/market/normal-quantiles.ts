import { NORMAL_HALF_TABLES } from "./normal-table"

/**
 * The standard normal quantiles at the midpoints of `buckets` equal-probability intervals, ascending,
 * as integers in millionths (ADR 0029). `buckets` is a power of two from 16 to 1024. The committed
 * table holds the upper half; the lower half is its mirror, so the table is odd-symmetric and sums to 0.
 */
export function normalQuantiles(buckets: number): readonly number[] {
	const text = NORMAL_HALF_TABLES[buckets]
	if (text === undefined) throw new RangeError(`No normal quantile table for ${buckets} buckets`)
	const upper = text.split(",").map(Number)
	const lower = upper.map((value) => -value).reverse()
	return [...lower, ...upper]
}
