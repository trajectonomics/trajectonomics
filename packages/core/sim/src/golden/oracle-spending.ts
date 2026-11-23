import { oraclePathSeed, oracleWords } from "./oracle-prng"

/**
 * A cash plan the oracle replays by brute force: one Account holding `opening`, a rent paid each month,
 * and a `currentRate` rule that reads the same Account on each twelfth month's first day and pays a
 * twelfth of `round(P × rateBps / 10000)` a month. Every month draws a bucket from the seeded stream.
 */
export interface OracleSpendingPlan {
	readonly opening: bigint
	readonly rent: bigint
	readonly rateBps: bigint
	/** A multiple of twelve: whole Annual roll-ups only. */
	readonly months: number
	readonly buckets: readonly { readonly returnBps: bigint; readonly weight: bigint }[]
	readonly seed: bigint
}

/** `numerator / denominator`, ties away from zero, for a non-negative numerator. */
function halfUp(numerator: bigint, denominator: bigint): bigint {
	return (numerator * 2n + denominator) / (denominator * 2n)
}

/** The return, in basis points, of each month's row on path `index`: the first bucket whose cumulative weight exceeds the draw. */
function returnsOf(plan: OracleSpendingPlan, index: number): bigint[] {
	return oracleWords(oraclePathSeed(plan.seed, index), plan.months).map((word) => {
		const draw = word >> 32n
		let total = 0n
		for (const bucket of plan.buckets) {
			total += bucket.weight
			if (draw < total) return bucket.returnBps
		}
		throw new Error("weights do not total 2^32")
	})
}

/** What the rule paid in each twelve-month roll-up on path `index`, month by month, stopping when cash runs out. */
export function oraclePathSpending(plan: OracleSpendingPlan, index: number): bigint[] {
	const returns = returnsOf(plan, index)
	const spent: bigint[] = Array.from({ length: plan.months / 12 }, () => 0n)
	let cash = plan.opening
	let yearly = 0n
	for (let month = 0; month < plan.months; month++) {
		if (month > 0) cash = halfUp(cash * (10000n + returns[month - 1]!), 10000n)
		if (month % 12 === 0) yearly = halfUp(cash * plan.rateBps, 10000n)
		const k = BigInt((month % 12) + 1)
		const pay = (yearly * k) / 12n - (yearly * (k - 1n)) / 12n
		const outflow = pay + plan.rent
		let met = outflow
		if (outflow > cash) met = cash
		spent[Math.floor(month / 12)]! += (met * pay) / outflow
		cash -= met
		if (met < outflow) break
	}
	return spent
}

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
	const spent = Array.from({ length: paths }, (_, index) => oraclePathSpending(plan, index))
	const bands = spent[0]!.map((_, year) =>
		levels.map((level) =>
			oraclePercentile(
				spent.map((path) => path[year]!),
				level,
			),
		),
	)
	const lows = spent.flatMap((path) => {
		const first = path.findIndex((value) => value > 0n)
		return first < 0 ? [] : [ascending(path.slice(first))[0]!]
	})
	return { bands, lows, lowest: levels.map((level) => oraclePercentile(lows, level)) }
}
