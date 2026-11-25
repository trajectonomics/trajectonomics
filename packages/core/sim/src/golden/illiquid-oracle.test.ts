import { describe, expect, it } from "bun:test"
import { makeFixture, type Setup } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { homeSetup } from "../fixtures/home-setup"
import { financialIndependence, project } from "../index"
import { firedOn, milestoned } from "../milestone/test-milestones"
import type { Milestone, ProjectionRow, ReferenceBasis } from "../types"
import { oracleMilestoneFi } from "./oracle-milestone-fi"
import { oracleWalk } from "./oracle-milestone-walk"
import { oracleReference } from "./oracle-reference"
import { oracleView } from "./oracle-view"

// Cash 300 and a home 6,000 on 1 Jan 2026. Salary 500 (earned) and living 100 on each 1st, so the
// cash is 700, 1,100 and 1,500 after each month's flows. Minimum buffer: 1 month of living, 100.
const home = { id: "home", kind: "asset", rate: 0 } as const
const marked: Setup = { ...homeSetup({ ...home, liquid: false }), resolution: "month" }
const unmarked: Setup = { ...homeSetup(home), resolution: "month" }
const MONTHS = ["2026-01-01", "2026-02-01", "2026-03-01"]

function fixtureOf(setup: Setup): Fixture {
	return makeFixture(setup)
}

function engineRows(setup: Setup): readonly ProjectionRow[] {
	const { baseline, scenario, timeline } = fixtureOf(setup)
	const result = project(baseline, scenario, timeline)
	if (!result.ok) throw new Error("projection refused")
	return result.projection.rows.filter((row) => MONTHS.includes(row.date))
}

/** The fire date the oracle's walk gives a Milestone, with the Milestone added to the Scenario. */
function oracleFire(setup: Setup, milestone: Milestone): string | undefined {
	const fixture = fixtureOf(setup)
	const withMilestone = { ...fixture, scenario: { ...fixture.scenario, milestones: [milestone] } }
	return oracleWalk(withMilestone, fixture.scenario.flows).fires.get(milestone.id)
}

describe("the oracle leaves a marked home out of accessible net worth, as the engine does", () => {
	it("gives cash alone as accessible net worth: 700, 1,100, 1,500", () => {
		// Hand: 300 + 500 − 100 = 700 after 1 Jan; 700 + 400 = 1,100 after 1 Feb; 1,500 after 1 Mar.
		// Net worth adds the home (6,000): 6,700, 7,100, 7,500.
		const expected = oracleView(fixtureOf(marked), MONTHS).rows
		expect(expected.map((row) => row.accessibleNetWorth)).toEqual([700, 1100, 1500])
		expect(expected.map((row) => row.netWorth)).toEqual([6700, 7100, 7500])
		expect(engineRows(marked).map((row) => row.accessibleNetWorth)).toEqual([700, 1100, 1500])
	})

	it("gives the same realAccessibleNetWorth as the engine, row by row", () => {
		// Inflation is 0 here, so the real figures equal the nominal ones: 700, 1,100, 1,500.
		const expected = oracleView(fixtureOf(marked), MONTHS).rows
		expect(expected.map((row) => row.realAccessibleNetWorth)).toEqual([700, 1100, 1500])
		expect(engineRows(marked).map((row) => row.realAccessibleNetWorth)).toEqual([700, 1100, 1500])
	})

	it("counts the unmarked home in accessible net worth: 6,700, 7,100, 7,500", () => {
		const expected = oracleView(fixtureOf(unmarked), MONTHS).rows
		expect(expected.map((row) => row.accessibleNetWorth)).toEqual([6700, 7100, 7500])
		expect(engineRows(unmarked).map((row) => row.accessibleNetWorth)).toEqual([6700, 7100, 7500])
	})
})

describe("the oracle's reference on the 1 Feb FI month matches the engine for each basis", () => {
	const options = { method: "survival", minBufferMonths: 1 } as const

	function oracleFigures(basis: ReferenceBasis) {
		const reference = oracleReference(fixtureOf(marked), "2026-02-01", { basis })
		if (reference === undefined) throw new Error("no oracle reference")
		return {
			unlockedAssets: Number(reference.unlockedAssets),
			numerator: Number(reference.numerator),
			multipleBps: Number(reference.multipleBps),
			met: reference.met,
		}
	}

	function engineFigures(basis: ReferenceBasis) {
		const { baseline, scenario, timeline } = fixtureOf(marked)
		const result = financialIndependence(baseline, scenario, timeline, {
			...options,
			reference: { basis },
		})
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("expected FI")
		const { reference } = result.financialIndependence
		return {
			unlockedAssets: reference.unlockedAssets,
			numerator: reference.numerator,
			multipleBps: reference.multipleBps,
			met: reference.met,
		}
	}

	// Annual expenses 1,200 (living 100 on 1 Feb to 1 Jan 2027); threshold 25 × 1,200 = 30,000, and
	// `met` is numerator ≥ threshold.
	it("unlockedAssets: 700 counted and in the numerator, a multiple of 5,833, not met", () => {
		// 700 × 10,000 / 1,200 = 5,833.33…, floored to 5,833.
		const hand = { unlockedAssets: 700, numerator: 700, multipleBps: 5833, met: false }
		expect(oracleFigures("unlockedAssets")).toEqual(hand)
		expect(engineFigures("unlockedAssets")).toEqual(hand)
	})

	it("accessibleNetWorth: the same 700, since the home is left out of that basis too", () => {
		const hand = { unlockedAssets: 700, numerator: 700, multipleBps: 5833, met: false }
		expect(oracleFigures("accessibleNetWorth")).toEqual(hand)
		expect(engineFigures("accessibleNetWorth")).toEqual(hand)
	})

	it("allAssets: unlocked 700, numerator 6,700, a multiple of 55,833, not met (6,700 < 30,000)", () => {
		// 6,700 × 10,000 / 1,200 = 55,833.33…, floored to 55,833.
		const hand = { unlockedAssets: 700, numerator: 6700, multipleBps: 55_833, met: false }
		expect(oracleFigures("allAssets")).toEqual(hand)
		expect(engineFigures("allAssets")).toEqual(hand)
	})

	it("netWorth: the marked home counts in the numerator, 6,700, as on allAssets", () => {
		const hand = { unlockedAssets: 700, numerator: 6700, multipleBps: 55_833, met: false }
		expect(oracleFigures("netWorth")).toEqual(hand)
		expect(engineFigures("netWorth")).toEqual(hand)
	})
})

describe("the FI month with a Minimum buffer matches the oracle's buffer walk", () => {
	it("gives 1 Feb 2026 with the home marked, and 1 Jan 2026 unmarked", () => {
		// Candidate 1 Jan: after 1 Jan's flows cash is 200, then 100, then 0 on 1 Mar, below the 100
		// the buffer needs, so it fails. Candidate 1 Feb: the January salary leaves 700, then 600 and
		// 500, all at least 100, so it passes. The unmarked home is accessible from 1 Jan.
		expect(oracleMilestoneFi(fixtureOf(marked), 1)).toEqual({
			month: "2026-02-01",
			annualExpenses: 1200,
		})
		const { baseline, scenario, timeline } = fixtureOf(marked)
		const engine = financialIndependence(baseline, scenario, timeline, {
			method: "survival",
			minBufferMonths: 1,
		})
		if (!engine.ok || !engine.financialIndependence.reachable) throw new Error("expected FI")
		expect(engine.financialIndependence).toMatchObject({ month: "2026-02-01" })
		expect(oracleMilestoneFi(fixtureOf(unmarked), 1)).toEqual({
			month: "2026-01-01",
			annualExpenses: 1200,
		})
	})
})

describe("an unmarked home counts as accessible but never pays the plan's bills", () => {
	it("gives 1 Feb 2026 on a longer horizon, the date the engine finds, not 1 Jan", () => {
		// The home is not in `withdraw`, so cash alone survives. Candidate 1 Jan: cash 200, 100, 0
		// and then −100 on 1 Apr, so it runs short, though cash plus the home never falls below the
		// 100 buffer. Candidate 1 Feb keeps the January salary and holds out to 1 Aug.
		const longer = { ...unmarked, horizon: "2026-08-01" }
		const { baseline, scenario, timeline } = fixtureOf(longer)
		const engine = financialIndependence(baseline, scenario, timeline, {
			method: "survival",
			minBufferMonths: 1,
		})
		if (!engine.ok || !engine.financialIndependence.reachable) throw new Error("expected FI")
		expect(engine.financialIndependence).toMatchObject({ month: "2026-02-01" })
		expect(oracleMilestoneFi(fixtureOf(longer), 1)).toEqual({
			month: "2026-02-01",
			annualExpenses: 1200,
		})
	})
})

describe("a Milestone that reads accessible net worth fires where the oracle's walk says", () => {
	// Each opening balance is taken before that day's flows: cash 300 on 1 Jan, 700 on 1 Feb,
	// 1,100 on 1 Mar. So 'invested' (accessible ≥ 1,100) fires on 1 Mar with the home marked, and on
	// 1 Jan unmarked, where the home is accessible (6,300). Net worth reaches 6,700 on 1 Feb either way.
	const invested: Milestone = {
		id: "invested",
		combine: "all",
		criteria: [
			{
				id: "c",
				kind: "metric",
				metric: "accessibleNetWorth",
				op: "atLeast",
				amount: 1100,
				terms: "nominal",
			},
		],
	}
	const rich: Milestone = {
		id: "rich",
		combine: "all",
		criteria: [
			{
				id: "c",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 6700,
				terms: "nominal",
			},
		],
	}

	it("fires 'invested' on 1 Mar with the home marked, and on 1 Jan unmarked", () => {
		expect(firedOn(milestoned(marked, [invested]), "invested")).toBe("2026-03-01")
		expect(oracleFire(marked, invested)).toBe("2026-03-01")
		expect(firedOn(milestoned(unmarked, [invested]), "invested")).toBe("2026-01-01")
		expect(oracleFire(unmarked, invested)).toBe("2026-01-01")
	})

	it("fires 'rich' on net worth on 1 Feb, whether or not the home is marked", () => {
		expect(firedOn(milestoned(marked, [rich]), "rich")).toBe("2026-02-01")
		expect(oracleFire(marked, rich)).toBe("2026-02-01")
		expect(firedOn(milestoned(unmarked, [rich]), "rich")).toBe("2026-02-01")
		expect(oracleFire(unmarked, rich)).toBe("2026-02-01")
	})
})
