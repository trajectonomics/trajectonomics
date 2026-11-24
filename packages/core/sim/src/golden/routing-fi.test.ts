import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { chanceOfSuccess, financialIndependence } from "../index"
import type { Flow, ReturnModel, WithdrawEntry } from "../types"
import { oracleAddMonthsClamped } from "./oracle-date"

const MONTHLY = { frequency: "monthly", start: "2026-01-01" } as const

/**
 * Salary 1,000,000 a month, living 600,000, a fund of 50,000,000 and cash at 0, to 2034-01-01 (97 months
 * of living, 1 January 2026 to 1 January 2034 both counted). Each month leaves 400,000 in cash. After `n` months of salary the plan lasts when
 * `600,000 × (97 − n) ≤ drawable + 400,000 × n`.
 */
function plan(withdraw: readonly WithdrawEntry[]): Fixture {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "fund", kind: "asset", rate: 0 },
		],
		balances: { cash: 0, fund: 50_000_000 },
		flows: [income("salary", 1_000_000, MONTHLY), expense("living", 600_000, MONTHLY)],
		surplus: [{ account: "cash" }],
		withdraw,
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
}

function scanned(fixture: Fixture): string | undefined {
	const { baseline, scenario, timeline } = fixture
	const result = financialIndependence(baseline, scenario, timeline, {
		method: "survival",
		minBufferMonths: 0,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.financialIndependence.reachable ? result.financialIndependence.month : undefined
}

function survives(fixture: Fixture, month: string): boolean {
	const stopped: readonly Flow[] = fixture.scenario.flows.flatMap((flow): Flow[] => {
		if (flow.kind !== "income" || !flow.earned) return [flow]
		return flow.start >= month ? [] : [{ ...flow, end: oracleAddMonthsClamped(month, -1) }]
	})
	const result = project(
		fixture.baseline,
		{ ...fixture.scenario, flows: stopped },
		fixture.timeline,
	)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection.runsOut === undefined
}

function bruteForce(fixture: Fixture): string | undefined {
	for (let month = "2026-01-01"; month <= "2033-12-01"; month = oracleAddMonthsClamped(month, 1)) {
		if (survives(fixture, month)) return month
	}
	return undefined
}

describe("Financial Independence reads a withdrawal floor as an order, not as less money listed", () => {
	// All 50,000,000 drawable: 8,200,000 ≤ 1,000,000 n, so n = 9 months of salary and the stop in the 10th.
	it("a plain list gives 2026-10-01", () => {
		const fixture = plan(["cash", "fund"])
		expect(scanned(fixture)).toBe("2026-10-01")
		expect(bruteForce(fixture)).toBe("2026-10-01")
	})

	// A floor of 10,000,000 that no later entry lowers keeps that money out of reach: 18,200,000 ≤ 1,000,000 n,
	// so n = 19 and the stop in the 20th month. The scan and the brute-force walk agree.
	it("a floor nothing lowers keeps its money out of reach: 2027-08-01", () => {
		const fixture = plan(["cash", { account: "fund", downTo: 10_000_000 }])
		expect(scanned(fixture)).toBe("2027-08-01")
		expect(bruteForce(fixture)).toBe("2027-08-01")
	})

	// The floor, then the rest of the fund: the order changed, nothing is out of reach, so it is the plain month.
	it("a floor that a later entry lowers to nothing gives the plain month again", () => {
		const fixture = plan(["cash", { account: "fund", downTo: 10_000_000 }, "fund"])
		expect(scanned(fixture)).toBe("2026-10-01")
		expect(bruteForce(fixture)).toBe("2026-10-01")
	})
})

const flat: ReturnModel = {
	id: "flat",
	accounts: ["cash"],
	buckets: [{ returnsBps: [0], weight: 4294967296 }],
}

/** A 60,000 bill on 15 January against 100,000 of cash, in a market that stays flat. */
function bill(withdraw: readonly WithdrawEntry[]): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 100_000 },
		flows: [expense("bill", 60_000, { start: "2026-01-15" })],
		surplus: [{ account: "cash" }],
		withdraw,
		horizon: "2026-01-31",
		resolution: "month",
	})
}

function successBps(fixture: Fixture): number | undefined {
	const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
		model: flat,
		seed: "0000000000000000",
		paths: 3,
	})
	return result.ok ? result.chance.successBps : undefined
}

describe("chance of success runs the floor on every path", () => {
	it("a floor of 40,000 leaves 60,000 drawable: the bill is met on all 3 paths", () => {
		expect(successBps(bill([{ account: "cash", downTo: 40_000 }]))).toBe(10_000)
	})

	it("a floor of 50,000 leaves 50,000 drawable: 10,000 stays unmet on all 3 paths", () => {
		expect(successBps(bill([{ account: "cash", downTo: 50_000 }]))).toBe(0)
	})
})
