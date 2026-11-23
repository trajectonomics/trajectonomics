import { describe, expect, it } from "bun:test"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { SpendingRule, SurvivalOptions } from "../types"
import { oracleAccountFi } from "./oracle-account-fi"
import { savingPlan as plan } from "./rule-cases"

const options = (minBufferMonths: number): SurvivalOptions =>
	({
		method: "survival",
		minBufferMonths,
		reference: { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" },
	}) as SurvivalOptions

function both(fixture: Fixture, minBufferMonths: number) {
	const { baseline, scenario, timeline } = fixture
	const result = financialIndependence(baseline, scenario, timeline, options(minBufferMonths))
	if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reachable")
	const { month, reference } = result.financialIndependence
	return {
		engine: { month, annualExpenses: BigInt(reference!.annualExpenses) },
		oracle: oracleAccountFi(fixture, minBufferMonths),
	}
}

const base = { portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const
const kinds: readonly [string, SpendingRule][] = [
	["initialRate", { kind: "initialRate", ...base }],
	["currentRate", { kind: "currentRate", ...base }],
	["guardrails", { kind: "guardrails", ...base, upper: { bps: 500, adjustBps: 1000 } }],
]

describe("FI on a plan with a Spending rule agrees with the brute-force walk", () => {
	for (const [name, rule] of kinds) {
		for (const buffer of [0, 12]) {
			it(`${name}, buffer ${buffer} months: the month and the reference expense`, () => {
				const { engine, oracle } = both(plan(rule), buffer)
				expect(oracle).toBeDefined()
				expect(engine).toEqual(oracle!)
			})
		}
	}

	it("a rule that follows the portfolio moves the FI month and the reference expense", () => {
		// No rule: 12 months of living is 1,800,000 and the buffer is met on 2027-03-01. A 4% rule
		// from 2026-04-01 adds a share of the portfolio to every window: 2,258,624 and 2027-07-01.
		expect(both(plan(undefined), 12).oracle).toEqual({
			month: "2027-03-01",
			annualExpenses: 1_800_000n,
		})
		const ruled = both(plan(kinds[1]![1]), 12)
		expect(ruled.oracle).toEqual({ month: "2027-07-01", annualExpenses: 2_258_624n })
		expect(ruled.engine).toEqual(ruled.oracle!)
	})
})
