import { describe, expect, it } from "bun:test"
import {
	contribution,
	derivedContribution,
	derivedExpense,
	expense,
	income,
} from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { Derive, Milestone, SurvivalOptions } from "../types"
import { oracleAccountFi } from "./oracle-account-fi"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/** `of` over `den`: an Account's value as a monthly share. */
function share(account: string, den: number): Derive {
	return {
		measures: [
			{ id: "value", op: "account", account },
			{ id: "share", op: "scale", of: "value", num: 1, den, rounding: "halfUp" },
		],
		result: "share",
	}
}

function options(minBufferMonths: number): SurvivalOptions {
	const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }
	return { method: "survival", minBufferMonths, reference } as SurvivalOptions
}

/** The engine's FI month and reference expense, and the independent walk's, on one plan. */
function both(fixture: Fixture, minBufferMonths: number) {
	const { baseline, scenario, timeline } = fixture
	const result = financialIndependence(baseline, scenario, timeline, options(minBufferMonths))
	if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reachable")
	const { month, reference } = result.financialIndependence
	const oracle = oracleAccountFi(fixture, minBufferMonths)
	return { engine: { month, annualExpenses: BigInt(reference!.annualExpenses) }, oracle }
}

describe("the FI windows price an account-reading expense from each candidate's own walk", () => {
	it("Plan A: stopping the salary stops the saving, so the stopped plan's upkeep is 3,021,879", () => {
		// Cash 2,000,000, inv 30,000,000 at 5%. The unchanged plan saves 500,000 a month into inv, so
		// its `run` (inv / 300 a month) is dearer: 3,139,092. The stopped plan saves nothing and pays
		// 150,000 a month from cash, then from inv: its 12 runs and 12 livings are 3,021,879.
		const run = derivedExpense("run", share("inv", 300), monthly)
		const fixture = makeFixture({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "inv", kind: "asset", rate: 500 },
			],
			balances: { cash: 2_000_000, inv: 30_000_000 },
			flows: [
				income("salary", 800_000, monthly),
				expense("living", 150_000, monthly),
				contribution("save", "inv", 500_000, monthly),
				run,
			],
			surplus: [{ account: "cash" }],
			contribute: ["inv"],
			withdraw: ["cash", "inv"],
			start: "2026-01-01",
			horizon: "2036-01-01",
			resolution: "month",
		})
		const { engine, oracle } = both(fixture, 12)
		expect(oracle).toEqual({ month: "2026-01-01", annualExpenses: 3_021_879n })
		expect(engine).toEqual(oracle!)
	})

	/** A home bought with 60% of the salary, which stopping the salary stops. */
	function planB(cash: number): Fixture {
		const buy: Derive = {
			measures: [
				{ id: "pay", op: "flow", flow: "salary" },
				{ id: "part", op: "scale", of: "pay", num: 60, den: 100, rounding: "halfUp" },
			],
			result: "part",
		}
		return makeFixture({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "home", kind: "asset", rate: 300, liquid: false },
			],
			balances: { cash },
			flows: [
				income("salary", 700_000, monthly),
				income("rent", 300_000, { ...monthly, earned: false }),
				expense("living", 150_000, monthly),
				derivedContribution("buy", "home", buy, monthly),
				derivedExpense("upkeep", share("home", 600), monthly),
			],
			surplus: [{ account: "cash" }],
			contribute: ["home"],
			withdraw: ["cash"],
			start: "2026-01-01",
			horizon: "2031-01-01",
			resolution: "month",
		})
	}

	it("Plan B, opening cash 0: the buffer is met on 1 May 2026, a month before the unchanged plan's price", () => {
		const { engine, oracle } = both(planB(0), 12)
		expect(oracle).toEqual({ month: "2026-05-01", annualExpenses: 1_834_269n })
		expect(engine).toEqual(oracle!)
	})

	it("Plan B, opening cash 1,250,000: the buffer is met on 1 Feb 2026, not 1 Mar", () => {
		const { engine, oracle } = both(planB(1_250_000), 12)
		expect(oracle).toEqual({ month: "2026-02-01", annualExpenses: 1_808_535n })
		expect(engine).toEqual(oracle!)
	})

	it("Plan C: a home bought only when 'later' fires is not paid for before then: 1,800,000", () => {
		// Cash 20,000,000, salary 500,000, living 150,000; the home (300,000) is bought on the day
		// 'later' fires, 1 Jan 2028. The unchanged plan, run with every gate off, buys it on 1 Jan
		// 2026 and prices upkeep into the first year (1,816,745); the stopped plan pays living only.
		const later: Milestone = {
			id: "later",
			combine: "all",
			criteria: [
				{ id: "when", kind: "date", on: "2028-01-01" },
				{
					id: "worth",
					kind: "metric",
					metric: "netWorth",
					op: "atLeast",
					amount: 0,
					terms: "nominal",
				},
			],
		}
		const built = makeFixture({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "home", kind: "asset", rate: 300, liquid: false },
			],
			balances: { cash: 20_000_000 },
			flows: [
				income("salary", 500_000, monthly),
				expense("living", 150_000, monthly),
				contribution("buy", "home", 300_000, { start: "2026-01-01", startAt: "later" }),
				derivedExpense("upkeep", share("home", 200), monthly),
			],
			surplus: [{ account: "cash" }],
			contribute: ["home"],
			withdraw: ["cash"],
			start: "2026-01-01",
			horizon: "2031-01-01",
			resolution: "month",
		})
		const fixture = { ...built, scenario: { ...built.scenario, milestones: [later] } }
		const { engine, oracle } = both(fixture, 12)
		expect(oracle).toEqual({ month: "2026-01-01", annualExpenses: 1_800_000n })
		expect(engine).toEqual(oracle!)
	})
})
