import { describe, expect, it } from "bun:test"
import { marketPath } from "./paths"
import { planReturnModel } from "./plan-model"
import { planScenario } from "./plan-model-fixture"

const fund = { id: "fund", kind: "asset", rate: 700, volatility: 1500 } as const
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" } as const
const seed = BigInt("0x0123456789abcdef")

/** The year-0 rates of 1,000 Market paths of one built model. */
function yearRates(): readonly number[] {
	const built = planReturnModel(
		{ ...planScenario([fund]), economy: { inflation: 300, inflationVolatility: 300 } },
		{ buckets: 256 },
	)
	if (!built.ok) throw new Error("refused")
	return Array.from({ length: 1000 }, (_, index) => {
		const prices = marketPath(built.model, seed, index, timeline, 300).prices
		if (prices === undefined) throw new Error("no prices")
		return prices.ratesBps[0]!
	})
}

describe("the inflation of 1,000 Market paths", () => {
	it("has a mean year-0 rate within 19 bps of the plan's 300", () => {
		const rates = yearRates()
		expect(rates).toHaveLength(1000)
		const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
		expect(Math.abs(mean - 300)).toBeLessThanOrEqual(19)
	})

	it("draws both a year below the mean and a year above it", () => {
		const rates = yearRates()
		expect(Math.min(...rates)).toBeLessThan(300)
		expect(Math.max(...rates)).toBeGreaterThan(300)
	})
})
