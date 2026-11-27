import { describe, expect, it } from "bun:test"
import type { InflationBucket, InflationFactor, Scenario } from "../types"
import { normalQuantiles } from "./normal-quantiles"
import { inflationFactorOf } from "./plan-inflation"
import { planReturnModel } from "./plan-model"
import { planScenario } from "./plan-model-fixture"

const fund = { id: "fund", kind: "asset", rate: 700, volatility: 1500 } as const
const FULL = 4_294_967_296

function scenario(inflation: number, volatility?: number): Scenario {
	return {
		...planScenario([fund]),
		economy: {
			inflation,
			...(volatility === undefined ? {} : { inflationVolatility: volatility }),
		},
	}
}

function factorOf(inflation: number, volatility: number, buckets: number): InflationFactor {
	const result = inflationFactorOf(
		scenario(inflation, volatility),
		normalQuantiles(buckets),
		FULL / buckets,
	)
	if (result.factor === undefined) throw new Error("no factor")
	return result.factor
}

const ratesOf = (factor: InflationFactor) => factor.buckets.map((bucket) => bucket.rateBps)

describe("the plan's inflation factor", () => {
	it("states 256 buckets whose rates sum to exactly 76,800 at a mean of 300", () => {
		const rates = ratesOf(factorOf(300, 200, 256))
		expect(rates).toHaveLength(256)
		expect(rates.reduce((sum, rate) => sum + rate, 0)).toBe(76_800)
	})

	it("is odd-symmetric around the mean: every pair sums to 600", () => {
		const rates = ratesOf(factorOf(300, 200, 256))
		for (let index = 0; index < 128; index++) {
			expect(rates[index]! + rates[255 - index]!).toBe(600)
		}
	})

	it("has the table's variance within 1 per cent, at 200 bps a year", () => {
		const rates = ratesOf(factorOf(300, 200, 256))
		const mean = rates.reduce((sum, rate) => sum + rate, 0) / 256
		const variance = rates.reduce((sum, rate) => sum + (rate - mean) ** 2, 0) / 256
		const z = normalQuantiles(256).map((value) => value / 10 ** 6)
		const table = z.reduce((sum, value) => sum + value ** 2, 0) / 256
		const expected = 200 * 200 * table
		expect(Math.abs(variance - expected)).toBeLessThanOrEqual(expected / 100)
	})

	it("weighs every bucket 2^32 / buckets", () => {
		expect(factorOf(300, 200, 64).buckets.every((bucket) => bucket.weight === FULL / 64)).toBe(true)
	})

	it("clamps a mean of 9,900 at 1,000 bps volatility and counts the clamps", () => {
		const result = inflationFactorOf(scenario(9900, 1000), normalQuantiles(256), FULL / 256)
		const rates = ratesOf(result.factor!)
		expect(Math.max(...rates)).toBe(10_000)
		expect(result.clamped).toBeGreaterThan(0)
		expect(rates.length - result.clamped).toBe(rates.filter((rate) => rate < 10_000).length)
	})

	it("lets a plan with no inflation and a volatility draw both ways around 0", () => {
		const rates = ratesOf(factorOf(0, 300, 256))
		expect(Math.min(...rates)).toBeLessThan(0)
		expect(Math.max(...rates)).toBeGreaterThan(0)
		expect(rates.reduce((sum, rate) => sum + rate, 0)).toBe(0)
	})

	it("is carried on the model `planReturnModel` builds, with the same buckets", () => {
		const built = planReturnModel(scenario(300, 150), { buckets: 256 })
		if (!built.ok) throw new Error("refused")
		const factor: InflationFactor | undefined = built.model.inflation
		expect(factor?.buckets).toHaveLength(256)
		expect(factor?.buckets[0]).toEqual<InflationBucket>({
			rateBps: ratesOf(factor!)[0]!,
			weight: FULL / 256,
		})
		expect(built.inflationClamped).toBeUndefined()
	})
})
