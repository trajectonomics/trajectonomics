import { describe, expect, it } from "bun:test"
import { growthYears } from "../calendar/arith"
import { makeFixture } from "../engine/test-helpers"
import { oraclePathSeed, oracleWords } from "../golden/oracle-prng"
import { chanceOfSuccess, projectPath } from "../index"
import { MAX_MARKET_ROWS, marketRows } from "../market/rows"
import type { InflationFactor, ReturnModel } from "../types"

const FULL = 4_294_967_296
const SEED = "0123456789abcdef"
const START = "2026-01-01"
const HORIZON = "2029-01-01"

const factor: InflationFactor = {
	buckets: [
		{ rateBps: 100, weight: FULL / 2 },
		{ rateBps: 500, weight: FULL / 2 },
	],
}

/** A zero-account market, so only inflation moves, with the issue's two-bucket factor. */
const model: ReturnModel = {
	id: "two-bucket",
	accounts: [],
	buckets: [
		{ returnsBps: [], weight: FULL / 2 },
		{ returnsBps: [], weight: FULL / 2 },
	],
	inflation: factor,
}

const fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 0 },
	flows: [
		{
			id: "salary",
			kind: "income",
			earned: true,
			amount: 1_000_000,
			frequency: "annual",
			start: START,
			growth: "inflation",
		},
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	inflation: 300,
	horizon: HORIZON,
	resolution: "month",
})

/** Path 0's yearly rates, read off the oracle's words after the market rows. */
function oracleRates(): readonly number[] {
	const dates = marketRows(fixture.timeline).slice(0, MAX_MARKET_ROWS)
	const years = growthYears(START, HORIZON)
	const words = oracleWords(oraclePathSeed(BigInt(`0x${SEED}`), 0), dates.length + years + 1)
	return words.slice(dates.length).map((word) => {
		const draw = Number(word >> 32n)
		const half = FULL / 2
		return factor.buckets[draw < half ? 0 : 1]!.rateBps
	})
}

describe("a chance of success with two inflation buckets", () => {
	it("draws [500, 100, 500, 500] for path 0 of this seed", () => {
		expect(oracleRates()).toEqual([500, 100, 500, 500])
	})

	it("pays the Stream the hand-computed amounts over the three years", () => {
		const rates = oracleRates()
		const result = projectPath(
			fixture.baseline,
			fixture.scenario,
			fixture.timeline,
			{ model, seed: SEED, paths: 1, index: 0 },
			{},
		)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		// By hand from the draws [500, 100, 500]: 1,000,000 x 1.05, then x 1.01, then x 1.05.
		expect(rates.slice(0, 3)).toEqual([500, 100, 500])
		expect(result.projection.annual.map((rollup) => rollup.income)).toEqual([
			1_000_000, 1_050_000, 1_060_500, 1_113_525,
		])
	})

	it("never runs out: every path succeeds", () => {
		const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
			model,
			seed: SEED,
			paths: 4,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.chance.successBps).toBe(10_000)
		expect(result.chance.realBands).toBeDefined()
	})
})
