import { describe, expect, it } from "bun:test"
import type { ReturnModel, Scenario } from "../types"
import { planReturnModel } from "./plan-model"
import { planScenario } from "./plan-model-fixture"

const fund = { id: "fund", kind: "asset", rate: 700, volatility: 1500 } as const

function scenario(volatility?: number): Scenario {
	return {
		...planScenario([fund]),
		economy: {
			inflation: 300,
			...(volatility === undefined ? {} : { inflationVolatility: volatility }),
		},
	}
}

/** The built model, or a thrown refusal so a test reads straight on. */
function built(volatility?: number): ReturnModel {
	const result = planReturnModel(scenario(volatility), { buckets: 64 })
	if (!result.ok) throw new Error("refused")
	return result.model
}

describe("a plan with no inflation volatility", () => {
	it("builds a model deep-equal to one with the field removed, with no inflation key", () => {
		const plain = built()
		for (const volatility of [undefined, 0] as const) {
			const model = built(volatility)
			expect(model).toEqual(plain)
			expect(Object.hasOwn(model, "inflation")).toBe(false)
		}
	})

	it("reports no clamps", () => {
		const result = planReturnModel(scenario(0), { buckets: 64 })
		if (!result.ok) throw new Error("refused")
		expect(result.inflationClamped).toBeUndefined()
	})
})
