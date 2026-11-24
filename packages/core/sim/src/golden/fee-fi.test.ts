import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { fund } from "../engine/test-fee"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { AssetRule, Flow } from "../types"
import { oracleAddMonthsClamped } from "./oracle-date"

const MONTHLY = { frequency: "monthly", start: "2026-01-01" } as const

/**
 * Salary 1,000,000 a month, living 600,000, a fund of 50,000,000 at 0% that the cashflow draws on, and
 * cash at 0. FI is the first month a stop of the salary still leaves money that lasts to 2034-01-01.
 */
function plan(account: AssetRule): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, account],
		balances: { cash: 0, fund: 50_000_000 },
		flows: [income("salary", 1_000_000, MONTHLY), expense("living", 600_000, MONTHLY)],
		surplus: [{ account: "cash" }],
		withdraw: ["cash", "fund"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
}

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

describe("a fee reduces the Account every candidate walks", () => {
	// 50,000,000 must carry 600,000 a month to 2034 after the salary stops; each month of salary saves
	// 400,000. Each fee leaves less to carry it, so FI waits for more saved months.
	for (const [bps, month] of [
		[0, "2026-10-01"],
		[150, "2027-01-01"],
		[600, "2027-12-01"],
	] as const) {
		it(`at ${bps} bps the scan gives ${month}, as a brute-force walk of every month does`, () => {
			const fixture = plan(fund({ bps }))
			expect(bruteForce(fixture)).toBe(month)
			expect(scanned(fixture)).toBe(month)
		})
	}
})
