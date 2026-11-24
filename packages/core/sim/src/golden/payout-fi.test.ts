import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { fund } from "../engine/test-payout"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { AssetRule, Flow } from "../types"
import { oracleAddMonthsClamped } from "./oracle-date"

const MONTHLY = { frequency: "monthly", start: "2026-01-01" } as const

/**
 * Salary 1,000,000 a month, living 600,000, a fund of 120,000,000 at 0% that pays 600 bps a year
 * monthly (0.5% of what is left, 600,000 the first month). Cash starts at 0. FI is the first month a
 * stop of the salary still leaves cash that never runs out to 2034-01-01.
 */
function plan(account: AssetRule): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, account],
		balances: { cash: 0, fund: 120_000_000 },
		flows: [income("salary", 1_000_000, MONTHLY), expense("living", 600_000, MONTHLY)],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
}

const payingFund = fund({ bps: 600, frequency: "monthly" })

/** The salary stopped before `month`, the Projection run to the horizon: no Shortfall means FI. */
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

/** The earliest month of the plan whose stop survives, found by running every month in turn. */
function bruteForce(fixture: Fixture): string | undefined {
	for (let month = "2026-01-01"; month <= "2033-12-01"; month = oracleAddMonthsClamped(month, 1)) {
		if (survives(fixture, month)) return month
	}
	return undefined
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

describe("payouts carry spending after work stops", () => {
	it("gives the month a brute-force walk finds, and the payouts are what makes it reachable", () => {
		const paying = plan(payingFund)
		const found = bruteForce(paying)
		// The walk lands the first stop that survives on 1 Feb 2027; reinvesting the fund, 1 Dec 2030.
		expect(found).toBe("2027-02-01")
		expect(scanned(paying)).toBe(found)
		// The same fund that reinvests everything cannot carry 600,000 a month from cash alone any sooner.
		const plain = plan({ id: "fund", kind: "asset", rate: 0 })
		expect(scanned(plain)).toBe(bruteForce(plain))
		expect(scanned(plain)).toBe("2030-12-01")
	})

	it("does not stop the payouts with the salary: passive income is not work", () => {
		const { baseline, scenario, timeline } = plan(payingFund)
		const result = project(baseline, scenario, timeline, { cashflowBreakdown: true })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const whole = result.projection.annual.filter((year) => !year.partial)
		expect(whole.every((year) => (year.payouts ?? 0) > 0)).toBe(true)
	})
})
