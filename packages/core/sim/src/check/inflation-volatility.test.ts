import { describe, expect, it } from "bun:test"
import { makeFixture } from "../engine/test-helpers"
import type { Economy } from "../types"
import { check } from "./index"

const base = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 0 },
	surplus: [{ account: "cash" }],
})

/** The codes and paths `check()` gives a Scenario whose economy is the given one. */
function problems(economy: Record<string, unknown>) {
	const scenario = { ...base.scenario, economy: economy as unknown as Economy }
	return check(base.baseline, scenario, base.timeline).map(
		(problem) => `${problem.code} ${problem.path.join("/")}`,
	)
}

describe("economy.inflationVolatility", () => {
	it("accepts 0 and 10000, and an absent field", () => {
		expect(problems({ inflation: 300, inflationVolatility: 0 })).toEqual([])
		expect(problems({ inflation: 300, inflationVolatility: 10_000 })).toEqual([])
		expect(problems({ inflation: 300 })).toEqual([])
	})

	it("refuses -1 and 10001 as RATE_OUT_OF_RANGE", () => {
		expect(problems({ inflation: 300, inflationVolatility: -1 })).toEqual([
			"RATE_OUT_OF_RANGE scenario/economy/inflationVolatility",
		])
		expect(problems({ inflation: 300, inflationVolatility: 10_001 })).toEqual([
			"RATE_OUT_OF_RANGE scenario/economy/inflationVolatility",
		])
	})

	it("refuses 1.5 and a non-number as NOT_SAFE_INTEGER", () => {
		expect(problems({ inflation: 300, inflationVolatility: 1.5 })).toEqual([
			"NOT_SAFE_INTEGER scenario/economy/inflationVolatility",
		])
		expect(problems({ inflation: 300, inflationVolatility: "300" })).toEqual([
			"NOT_SAFE_INTEGER scenario/economy/inflationVolatility",
		])
	})

	it("still refuses an unknown economy key", () => {
		expect(problems({ inflation: 300, volatility: 300 })).toEqual([
			"UNKNOWN_KEY scenario/economy/volatility",
		])
	})
})
