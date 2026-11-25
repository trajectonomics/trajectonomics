import type { MinorUnits } from "../types"

/** An ascending copy of a sample. The comparison is exact because every value is a safe integer. */
export function ascending(values: readonly MinorUnits[]): MinorUnits[] {
	return [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
}

/**
 * The nearest-rank value at `level` (1..100) of an ascending, non-empty sample: the element at
 * index `ceil(level × N / 100) − 1`, computed in integers, so the result is a value the sample holds.
 */
export function nearestRank(sorted: readonly MinorUnits[], level: number): MinorUnits {
	const rank = (BigInt(level) * BigInt(sorted.length) + 99n) / 100n
	return sorted[Number(rank) - 1]!
}
