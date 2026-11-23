import { type OracleSpendingPlan, oraclePath } from "./oracle-spending"

function ascending(sample: readonly bigint[]): bigint[] {
	return [...sample].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/** The smallest sample value with at least `level` percent of the sample at or below it. */
export function oraclePercentile(sample: readonly bigint[], level: number): bigint {
	const distinct = [...new Set(ascending(sample))]
	for (const value of distinct) {
		const atOrBelow = sample.filter((other) => other <= value).length
		if (atOrBelow * 100 >= level * sample.length) return value
	}
	throw new Error("empty sample")
}

export interface OracleSpendingBands {
	readonly bands: bigint[][]
	/** Each path's lowest year, for the paths that have one. */
	readonly lows: bigint[]
	readonly lowest: bigint[]
}

/** Every roll-up's five Percentiles, and the five Percentiles of each path's lowest year, over `paths` paths. */
export function oracleSpendingBands(plan: OracleSpendingPlan, paths: number): OracleSpendingBands {
	const levels = [10, 25, 50, 75, 90]
	const walked = Array.from({ length: paths }, (_, index) => oraclePath(plan, index))
	const bands = walked[0]!.spent.map((_, year) =>
		levels.map((level) =>
			oraclePercentile(
				walked.map((path) => path.spent[year]!),
				level,
			),
		),
	)
	const lows = walked.flatMap((path) => path.lowest ?? [])
	return {
		bands,
		lows,
		lowest: lows.length === 0 ? [] : levels.map((level) => oraclePercentile(lows, level)),
	}
}
