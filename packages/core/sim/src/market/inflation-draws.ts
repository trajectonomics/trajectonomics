import { growthYears } from "../calendar/arith"
import type { PricePath } from "../money/inflation"
import { type BucketTable, draw32, pickBucket } from "../prng/bucket"
import { nextSplitMix } from "../prng/splitmix64"
import type { BasisPoints, InflationFactor, Timeline } from "../types"

/**
 * The yearly inflation of one Market path: `Y + 1` draws taken from the path's own stream after its
 * market rows, so turning the factor on leaves every Account's rows unchanged (ADR 0033). `Y` is the
 * Timeline's growth years, plus one for the year holding the horizon.
 */
export function drawPrices(
	factor: InflationFactor,
	table: BucketTable,
	state: bigint,
	timeline: Timeline,
	outsideBps: BasisPoints,
): PricePath {
	const years = growthYears(timeline.start, timeline.horizon)
	const ratesBps: BasisPoints[] = []
	let next = state
	for (let year = 0; year <= years; year++) {
		const step = nextSplitMix(next)
		next = step.state
		ratesBps.push(factor.buckets[pickBucket(table, draw32(step.word))]!.rateBps)
	}
	return { start: timeline.start, ratesBps, outsideBps }
}
