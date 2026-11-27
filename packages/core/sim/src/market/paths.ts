import { resolveReturns } from "../engine/return-rows"
import type { ResolvedReturns, ReturnRow, Returns } from "../engine/returns"
import { type BucketTable, bucketTable, draw32, pickBucket } from "../prng/bucket"
import { pathSeed } from "../prng/path-seed"
import { nextSplitMix } from "../prng/splitmix64"
import type { BasisPoints, InflationFactor, ReturnModel, Timeline } from "../types"
import { drawPrices } from "./inflation-draws"
import { MAX_MARKET_ROWS, type MarketRow, marketRows } from "./rows"

/** The bucket table of a factor, or nothing when the model holds no factor to draw from. */
function inflationTable(factor: InflationFactor | undefined): BucketTable | undefined {
	if (factor === undefined) return undefined
	return bucketTable(factor.buckets.map((bucket) => bucket.weight))
}

/** One Market path: a bucket draw per row, one Return series per Account in the model, then inflation. */
function pathReturns(
	model: ReturnModel,
	table: BucketTable,
	inflTable: BucketTable | undefined,
	dates: readonly MarketRow[],
	seed: bigint,
	index: number,
	timeline: Timeline,
	outsideBps: BasisPoints | undefined,
): Returns {
	const rows: ReturnRow[][] = model.accounts.map(() => [])
	let state = pathSeed(seed, index)
	for (const { from, span } of dates) {
		const step = nextSplitMix(state)
		state = step.state
		const bucket = model.buckets[pickBucket(table, draw32(step.word))]!
		for (let account = 0; account < model.accounts.length; account++) {
			rows[account]!.push({ from, returnBps: bucket.returnsBps[account]!, span })
		}
	}
	const factor = model.inflation
	const prices =
		factor === undefined || inflTable === undefined || outsideBps === undefined
			? undefined
			: drawPrices(factor, inflTable, state, timeline, outsideBps)
	return {
		returnsVersion: 1,
		series: model.accounts.map((account, position) => ({ account, rows: rows[position]! })),
		...(prices === undefined ? {} : { prices }),
	}
}

/** Market path `index` alone: its draws come from its own seed, so no earlier path is built. */
export function marketPath(
	model: ReturnModel,
	seed: bigint,
	index: number,
	timeline: Timeline,
	outsideBps?: BasisPoints,
): Returns {
	const table = bucketTable(model.buckets.map((bucket) => bucket.weight))
	const dates = marketRows(timeline).slice(0, MAX_MARKET_ROWS)
	return pathReturns(
		model,
		table,
		inflationTable(model.inflation),
		dates,
		seed,
		index,
		timeline,
		outsideBps,
	)
}

/**
 * Market paths one at a time, unresolved, in index order: the input `runEngine` takes. Lazy, so a
 * caller holds one path's rows at once rather than every path's.
 */
export function* marketReturns(
	model: ReturnModel,
	seed: bigint,
	paths: number,
	timeline: Timeline,
	outsideBps?: BasisPoints,
): Generator<Returns> {
	const table = bucketTable(model.buckets.map((bucket) => bucket.weight))
	const inflTable = inflationTable(model.inflation)
	const dates = marketRows(timeline).slice(0, MAX_MARKET_ROWS)
	for (let index = 0; index < paths; index++) {
		yield pathReturns(model, table, inflTable, dates, seed, index, timeline, outsideBps)
	}
}

/** Every Market path of a run, resolved once against the Timeline: the draw is shared by all Accounts. */
export function marketPaths(
	model: ReturnModel,
	seed: bigint,
	paths: number,
	timeline: Timeline,
): readonly ResolvedReturns[] {
	return Array.from(marketReturns(model, seed, paths, timeline), (returns) =>
		resolveReturns(returns, timeline),
	)
}
