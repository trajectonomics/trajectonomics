import { resolveReturns } from "../engine/return-rows"
import type { ResolvedReturns, ReturnRow, Returns } from "../engine/returns"
import { type BucketTable, bucketTable, draw32, pickBucket } from "../prng/bucket"
import { pathSeed } from "../prng/path-seed"
import { nextSplitMix } from "../prng/splitmix64"
import type { ReturnModel, Timeline } from "../types"
import { MAX_MARKET_ROWS, type MarketRow, marketRows } from "./rows"

/** One Market path: a bucket draw per row, one Return series per Account in the model. */
function pathReturns(
	model: ReturnModel,
	table: BucketTable,
	dates: readonly MarketRow[],
	seed: bigint,
	index: number,
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
	return {
		returnsVersion: 1,
		series: model.accounts.map((account, position) => ({ account, rows: rows[position]! })),
	}
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
): Generator<Returns> {
	const table = bucketTable(model.buckets.map((bucket) => bucket.weight))
	const dates = marketRows(timeline).slice(0, MAX_MARKET_ROWS)
	for (let index = 0; index < paths; index++) {
		yield pathReturns(model, table, dates, seed, index)
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
