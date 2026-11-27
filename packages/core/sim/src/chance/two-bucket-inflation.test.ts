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

/** `amount` compounded by whole years of `rates`, rounded half up: the rule written out. */
function grown(amount: bigint, rates: readonly number[]): bigint {
	const scale = 10_000n ** BigInt(rates.length)
	let num = 1n
	for (const rate of rates) num *= 10_000n + BigInt(rate)
	return (2n * amount * num + scale) / (2n * scale)
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
		expect(result.projection.annual.map((rollup) => rollup.income)).toEqual([
			1_000_000,
			Number(grown(1_000_000n, rates.slice(0, 1))),
			Number(grown(1_000_000n, rates.slice(0, 2))),
			Number(grown(1_000_000n, rates.slice(0, 3))),
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
