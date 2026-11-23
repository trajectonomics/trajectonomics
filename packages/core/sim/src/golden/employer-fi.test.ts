import { describe, expect, it } from "bun:test"
import { income } from "../engine/test-flows"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { SurvivalOptions } from "../types"
import { derivedShare, employerPlan, fixedShare, livingFlows } from "./employer-cases"
import { oracleAccountFi } from "./oracle-account-fi"

const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }
const options = { method: "survival", minBufferMonths: 6, reference } as SurvivalOptions

/** The engine's FI month and reference expense, and the independent brute force's, on one plan. */
function both(fixture: Fixture) {
	const { baseline, scenario, timeline } = fixture
	const result = financialIndependence(baseline, scenario, timeline, options)
	if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reachable")
	const { month, reference: found } = result.financialIndependence
	return {
		engine: { month, annualExpenses: BigInt(found!.annualExpenses) },
		oracle: oracleAccountFi(fixture, 6),
	}
}

describe("an employer share stops at the candidate month, as a brute force walk finds", () => {
	// With k months worked (salary and the employer's 200,000 land in each) the household holds 5,000,000 +
	// 900,000k, and the 97 monthly dates through 1 Jan 2034 have 97 − k months at −300,000 after the stop.
	// The Minimum buffer is 6 × 600,000 = 3,600,000: 1,200,000k − 24,100,000 ≥ 3,600,000 first holds at k = 24,
	// so FI is 1 Jan 2028. k = 23 leaves 27,600,000 against 27,700,000.
	it("a fixed share of 200,000 a month gives 1 Jan 2028", () => {
		const { engine, oracle } = both(employerPlan([...livingFlows, fixedShare]))
		expect(oracle).toEqual({ month: "2028-01-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("a share of 20% of the salary's gross gives the same month, as the salary and the share stop together", () => {
		const { engine, oracle } = both(employerPlan([...livingFlows, derivedShare]))
		expect(oracle).toEqual({ month: "2028-01-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("without the share the month is 1 May 2028: 700,000 a month needs 28 months", () => {
		const { engine, oracle } = both(employerPlan(livingFlows))
		expect(oracle).toEqual({ month: "2028-05-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("a share that kept paying after work stops would have given 1 Oct 2026, so the stop is what moves it", () => {
		// A pension-like 200,000 income that is not earned: 5,000,000 + 900,000k − 100,000 × (97 − k) ≥ 3,600,000
		// first holds at k = 9, 1 Oct 2026. A person who expects to leave states a shorter end instead.
		const pension = income("pension", 200_000, {
			frequency: "monthly",
			start: "2026-01-01",
			earned: false,
		})
		const { engine } = both(employerPlan([...livingFlows, pension]))
		expect(engine.month).toBe("2026-10-01")
	})
})
