import { describe, expect, it } from "bun:test"
import { purchase, saleOfAll } from "../engine/test-assets"
import { derivedExpense, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { Derive, Flow, Milestone, SurvivalOptions } from "../types"
import { oracleAccountFi } from "./oracle-account-fi"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const later = { start: "2026-01-01", startAt: "later" } as const

function options(minBufferMonths: number): SurvivalOptions {
	const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }
	return { method: "survival", minBufferMonths, reference } as SurvivalOptions
}

/** The engine's FI month and reference expense, and the independent brute force's, on one plan. */
function both(fixture: Fixture) {
	const { baseline, scenario, timeline } = fixture
	const result = financialIndependence(baseline, scenario, timeline, options(6))
	if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reachable")
	const { month, reference } = result.financialIndependence
	return {
		engine: { month, annualExpenses: BigInt(reference!.annualExpenses) },
		oracle: oracleAccountFi(fixture, 6),
	}
}

/** Cash 5,000,000, a home worth 10,000,000 (illiquid, rate 0), and the given Flows and Milestones. */
function plan(flows: readonly Flow[], milestones: readonly Milestone[]): Fixture {
	const built = makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "home", kind: "asset", rate: 0, liquid: false },
		],
		balances: { cash: 5_000_000, home: 10_000_000 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
	if (milestones.length === 0) return built
	return { ...built, scenario: { ...built.scenario, milestones } }
}

const worth = (amount: number): Milestone => ({
	id: "later",
	combine: "all",
	criteria: [
		{ id: "w", kind: "metric", metric: "netWorth", op: "atLeast", amount, terms: "nominal" },
	],
})
const onDate = (on: string): Milestone => ({
	id: "later",
	combine: "all",
	criteria: [{ id: "d", kind: "date", on }],
})

/** Salary 1,000,000 and rent 300,000 come in, living 600,000 goes out: +700,000 a month, −300,000 once the salary stops. */
const living: readonly Flow[] = [
	income("salary", 1_000_000, monthly),
	income("rent", 300_000, { ...monthly, earned: false }),
	expense("living", 600_000, monthly),
]

describe("a purchase or a sale gated on a Milestone moves the FI month, as a brute force walk finds", () => {
	it("without either, FI is 1 May 2028", () => {
		// 28 months of +700,000 give cash 24,600,000 on 1 May 2028 (counting 1 Jan 2026 to 1 Apr 2028). The 69
		// months left to 1 Jan 2034 cost 300,000 each, 20,700,000, and the buffer wants 6 × 600,000 = 3,600,000: 24,300,000.
		// A month earlier the cash is 23,900,000 against 24,600,000.
		const { engine, oracle } = both(plan(living, []))
		expect(oracle).toEqual({ month: "2028-05-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("a sale of the whole home when net worth reaches 30,000,000 moves it to 1 Nov 2027", () => {
		// Net worth is 15,000,000 + 700,000 a month, so the Milestone fires on 1 Nov 2027 in the plan that
		// keeps its salary (22 evaluations). A candidate that stops earlier never reaches 30,000,000 in its own
		// walk, sells nothing, and falls 4,500,000 short; 1 Nov 2027 fires on its own walk and sells 10,000,000.
		const { engine, oracle } = both(
			plan([...living, saleOfAll("sell", "home", later)], [worth(30_000_000)]),
		)
		expect(oracle).toEqual({ month: "2027-11-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("a sale on a fixed date, 1 Jul 2027, moves it to 1 Jul 2027", () => {
		const { engine, oracle } = both(
			plan([...living, saleOfAll("sell", "home", later)], [onDate("2027-07-01")]),
		)
		expect(oracle).toEqual({ month: "2027-07-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("a 6,000,000 purchase when net worth reaches 20,000,000 moves it to 1 Nov 2028", () => {
		// The purchase lands on 1 Sep 2026 whatever the candidate does, and takes 6,000,000 of cash. Each
		// month's wait adds 1,000,000 to the margin (a month of salary kept and a month of outflow spared),
		// so FI comes 6 months later than without it.
		const { engine, oracle } = both(
			plan([...living, purchase("car", "home", 6_000_000, later)], [worth(20_000_000)]),
		)
		expect(oracle).toEqual({ month: "2028-11-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})
})

describe("an expense that reads the home is priced from each candidate's own walk of the sale", () => {
	/** Upkeep of 1/600 of the home's value a month; a sold home costs nothing to keep. */
	const upkeep: Derive = {
		measures: [
			{ id: "value", op: "account", account: "home" },
			{ id: "share", op: "scale", of: "value", num: 1, den: 600, rounding: "halfUp" },
		],
		result: "share",
	}

	// Kept, the 10,000,000 home costs 16,667 a month (halfUp of 16,666.67): 7,200,000 + 200,004 = 7,400,004 a
	// year, and FI is 1 Jul 2028. Sold on 1 Jul 2027 it costs nothing from then: 7,200,000, and FI is 1 Aug 2027.
	it("prices the upkeep a sold home no longer costs, and a kept one does", () => {
		const kept = [...living, derivedExpense("upkeep", upkeep, monthly)]
		const keptBoth = both(plan(kept, []))
		expect(keptBoth.oracle).toEqual({ month: "2028-07-01", annualExpenses: 7_400_004n })
		expect(keptBoth.engine).toEqual(keptBoth.oracle!)
		const sold = both(plan([...kept, saleOfAll("sell", "home", later)], [onDate("2027-07-01")]))
		expect(sold.oracle).toEqual({ month: "2027-08-01", annualExpenses: 7_200_000n })
		expect(sold.engine).toEqual(sold.oracle!)
	})
})
