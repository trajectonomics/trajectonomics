import { describe, expect, it } from "bun:test"
import { makeFixture } from "../engine/test-helpers"
import { chanceOfSuccess } from "../index"
import type { ChancePercentile, InflationFactor, ReturnModel } from "../types"

const FULL = 4_294_967_296
const SEED = "0123456789abcdef"

/** Two buckets that pay nothing and 10 per cent a year, so a path's real worth has two values. */
const factor: InflationFactor = {
	buckets: [
		{ rateBps: 0, weight: FULL / 2 },
		{ rateBps: 1000, weight: FULL / 2 },
	],
}

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
	balances: { cash: 1_000_000 },
	surplus: [{ account: "cash" }],
	inflation: 300,
	horizon: "2027-01-01",
	resolution: "month",
})

function bands(): readonly { readonly netWorth: readonly ChancePercentile[] }[] {
	const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
		model,
		seed: SEED,
		paths: 2,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance.realBands!
}

describe("the real Bands of a plan that draws inflation", () => {
	it("leaves every nominal Band at 1,000,000", () => {
		const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
			model,
			seed: SEED,
			paths: 2,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		for (const band of result.chance.bands) {
			expect(band.netWorth.map((value) => value.value)).toEqual([
				1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000,
			])
		}
	})

	it("deflates each path by its own 364-day price level", () => {
		// 1,000,000 x 3,650,000 / 4,014,000, rounded half up, is 909,317: the 10 per cent path.
		const values = bands()[0]!.netWorth.map((value) => value.value)
		expect(values).toEqual([909_317, 909_317, 909_317, 1_000_000, 1_000_000])
	})
})
