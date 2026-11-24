import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { transfer } from "../engine/test-transfer"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { Account, Flow, Milestone, SurvivalOptions } from "../types"
import { oracleAccountFi } from "./oracle-account-fi"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const later = { start: "2026-01-01", startAt: "later" } as const
const rmf: Account = { id: "rmf", kind: "asset", rate: 0, lockedUntil: "2040-01-01" }
const fund: Account = { id: "fund", kind: "asset", rate: 0 }
const onJul2027: Milestone = {
	id: "later",
	combine: "all",
	criteria: [{ id: "d", kind: "date", on: "2027-07-01" }],
}

const options = (minBufferMonths: number): SurvivalOptions =>
	({
		method: "survival",
		minBufferMonths,
		reference: { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" },
	}) as SurvivalOptions

/** Salary 1,000,000 and rent 300,000 come in, living 600,000 goes out: +700,000 a month, −300,000 once the salary stops. */
const living: readonly Flow[] = [
	income("salary", 1_000_000, monthly),
	income("rent", 300_000, { ...monthly, earned: false }),
	expense("living", 600_000, monthly),
]

function plan(
	flows: readonly Flow[],
	extra: Account,
	withdraw: readonly string[] = ["cash", extra.id],
): Fixture {
	const built = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, extra],
		balances: { cash: 5_000_000 },
		flows: [...living, ...flows],
		surplus: [{ account: "cash" }],
		withdraw,
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
	return { ...built, scenario: { ...built.scenario, milestones: [onJul2027] } }
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

describe("a transfer moves the FI month by what it takes out of reach, as a brute force walk finds", () => {
	it("without a transfer, FI is 1 May 2028", () => {
		// 28 months of +700,000 make cash 24,600,000 on 1 May 2028; the 69 months left cost 300,000 each,
		// 20,700,000, and the buffer wants 6 × 600,000 = 3,600,000: 24,300,000. A month earlier: 23,900,000.
		const { engine, oracle } = both(plan([], fund))
		expect(oracle).toEqual({ month: "2028-05-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("6,000,000 locked into an RMF on 1 July 2027 moves it to 1 Nov 2028", () => {
		// The transfer lands on 1 Jul 2027 in every candidate's walk and puts 6,000,000 out of reach until 2040, so
		// each month of salary kept gives 1,000,000 of margin (a month of pay and a month of outflow spared): 6 months.
		const { engine, oracle } = both(plan([transfer("lock", "cash", "rmf", 6_000_000, later)], rmf))
		expect(oracle).toEqual({ month: "2028-11-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("the same 6,000,000 into a liquid fund that `withdraw` lists changes nothing: FI stays 1 May 2028", () => {
		const { engine, oracle } = both(
			plan([transfer("shift", "cash", "fund", 6_000_000, later)], fund),
		)
		expect(oracle).toEqual({ month: "2028-05-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})

	it("into a fund that `withdraw` does not list, the money is out of the draw's reach: 1 Aug 2028", () => {
		// The fund counts in Accessible net worth, but a Shortfall draws only the Accounts `withdraw` names, so the
		// walk cannot spend the 6,000,000 and a later month is needed. The brute force finds the same month.
		const { engine, oracle } = both(
			plan([transfer("shift", "cash", "fund", 6_000_000, later)], fund, ["cash"]),
		)
		expect(oracle).toEqual({ month: "2028-08-01", annualExpenses: 7_200_000n })
		expect(engine).toEqual(oracle!)
	})
})
