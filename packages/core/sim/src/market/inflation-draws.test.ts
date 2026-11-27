import { describe, expect, it } from "bun:test"
import { growthYears } from "../calendar/arith"
import { oraclePathSeed, oracleWords } from "../golden/oracle-prng"
import type { InflationFactor, ReturnModel } from "../types"
import { marketPath, marketPaths, marketReturns } from "./paths"
import { MAX_MARKET_ROWS, marketRows } from "./rows"

const FULL = 4_294_967_296
const SEED = "0123456789abcdef"
const start = "2026-01-01"
const timeline = { start, horizon: "2029-01-01", resolution: "month" } as const

/** Sixteen buckets of ten bps apart, so a draw names the bucket it took. */
const factor: InflationFactor = {
	buckets: Array.from({ length: 16 }, (_, index) => ({
		rateBps: index * 10 - 80,
		weight: FULL / 16,
	})),
}

function model(inflation?: InflationFactor): ReturnModel {
	return {
		id: "hand",
		accounts: ["fund"],
		buckets: [
			{ returnsBps: [0], weight: FULL / 2 },
			{ returnsBps: [900], weight: FULL / 2 },
		],
		...(inflation === undefined ? {} : { inflation }),
	}
}

/** The bucket a draw of the high 32 bits picks, walked over the weights. */
function bucketOf(draw: number): number {
	let total = 0
	for (let index = 0; index < factor.buckets.length; index++) {
		total += factor.buckets[index]!.weight
		if (draw < total) return index
	}
	throw new Error(`draw ${draw} is past the table`)
}

const seed = BigInt(`0x${SEED}`)

describe("the inflation draws of a Market path", () => {
	it("leaves every Account's rows byte-identical when the factor is present", () => {
		const priced = marketPath(model(factor), seed, 0, timeline, 300)
		const plain = marketPath(model(), seed, 0, timeline, 300)
		expect(priced.series).toEqual(plain.series)
		expect(priced.prices).toBeDefined()
		expect(plain.prices).toBeUndefined()
	})

	it("takes path 0's rates from the words after its market rows", () => {
		const dates = marketRows(timeline).slice(0, MAX_MARKET_ROWS)
		const years = growthYears(start, timeline.horizon)
		const words = oracleWords(oraclePathSeed(seed, 0), dates.length + years + 1)
		const expected = Array.from({ length: years + 1 }, (_, year) => {
			const word = words[dates.length + year]!
			return factor.buckets[bucketOf(Number(word >> 32n))]!.rateBps
		})
		const priced = marketPath(model(factor), seed, 0, timeline, 300)
		expect(priced.prices?.ratesBps).toHaveLength(4)
		expect(priced.prices?.ratesBps).toEqual(expected)
		expect(priced.prices?.start).toBe(start)
		expect(priced.prices?.outsideBps).toBe(300)
	})

	it("draws one rate per growth year plus the year holding the horizon", () => {
		const offAnniversary = { ...timeline, horizon: "2028-12-31" } as const
		expect(marketPath(model(factor), seed, 0, timeline, 300).prices?.ratesBps).toHaveLength(4)
		expect(marketPath(model(factor), seed, 0, offAnniversary, 300).prices?.ratesBps).toHaveLength(3)
	})

	it("takes each path's rates from its own words after the market rows", () => {
		const dates = marketRows(timeline).slice(0, MAX_MARKET_ROWS)
		const years = growthYears(start, timeline.horizon)
		for (const index of [1, 7]) {
			const words = oracleWords(oraclePathSeed(seed, index), dates.length + years + 1)
			const expected = Array.from({ length: years + 1 }, (_, year) => {
				const word = words[dates.length + year]!
				return factor.buckets[bucketOf(Number(word >> 32n))]!.rateBps
			})
			const priced = marketPath(model(factor), seed, index, timeline, 300)
			expect(priced.prices?.ratesBps).toEqual(expected)
		}
	})

	it("gives every path of `marketReturns` the same prices `marketPath` builds", () => {
		const lazy = Array.from(marketReturns(model(factor), seed, 3, timeline, 250))
		lazy.forEach((returns, index) => {
			expect(returns.prices).toEqual(marketPath(model(factor), seed, index, timeline, 250).prices)
		})
	})

	it("draws no prices when no outside rate is given, as the FI paths do", () => {
		expect(marketPath(model(factor), seed, 0, timeline).prices).toBeUndefined()
		expect(marketPaths(model(factor), seed, 2, timeline).every((path) => path.size === 1)).toBe(
			true,
		)
	})
})
