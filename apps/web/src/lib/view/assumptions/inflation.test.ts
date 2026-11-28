import { describe, expect, test } from "bun:test"
import type { ScenarioShow } from "../../contract"
import { inflationSwingOf, inflationSwingWords } from "./inflation"

describe("inflationSwingWords", () => {
	test("states the swing in percent a year, from the plan's basis points", () => {
		expect(inflationSwingWords({ inflation: 300, inflationVolatility: 150 })).toBe(
			"Inflation swing: ±1.50% a year",
		)
		expect(inflationSwingWords({ inflation: 300, inflationVolatility: 10000 })).toBe(
			"Inflation swing: ±100.00% a year",
		)
	})

	test("states no line for a plan that draws no swing", () => {
		expect(inflationSwingWords({ inflation: 300, inflationVolatility: 0 })).toBeNull()
		expect(inflationSwingWords({ inflation: 300 })).toBeNull()
		expect(inflationSwingWords(undefined)).toBeNull()
	})
})

describe("inflationSwingOf", () => {
	test("reads the swing off what the Assumptions page shows", () => {
		const show = {
			document: { economy: { inflation: 300, inflationVolatility: 150 } },
		} as ScenarioShow["scenario"]
		expect(inflationSwingOf(show)).toBe("Inflation swing: ±1.50% a year")
	})
})
