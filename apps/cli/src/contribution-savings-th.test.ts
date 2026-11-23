import { describe, expect, it } from "bun:test"
import {
	contributionSavings,
	type Flow,
	project,
	type Scenario,
	type SettlementPeriod,
} from "@trajectonomics/core/sim"
import { emitThLevy, ThLevyContributionLabel, ThLevyIncomeLabel } from "@trajectonomics/core/tax/th"

/** Satang, so 100 is one baht; the caller of `contributionSavings` passes one baht as its grain. */
const BAHT = 100
const STEP = 50_000 * BAHT
const RMF = ThLevyContributionLabel.Rmf
const SSF = ThLevyContributionLabel.Ssf

/** The 2025 period ends after the Timeline starts, so its Carry-in is stated, empty. */
const levy = {
	...emitThLevy({}),
	carryIn: [{ periodStart: "2025-01-01", tallies: [], prepaid: 0 }],
}

/** A 2026 salary of 100,000 a month on Section 40(1), and `rmfPerMonth` baht a month into RMF. */
function plan(rmfPerMonth: number): Scenario {
	const salary: Flow = {
		id: "salary",
		kind: "income",
		earned: true,
		label: ThLevyIncomeLabel.Section40_1,
		amount: 100_000 * BAHT,
		frequency: "monthly",
		start: "2026-01-31",
		growth: { bps: 0 },
	}
	const saving: Flow = {
		id: "rmf",
		kind: "contribution",
		target: "fund",
		label: RMF,
		amount: rmfPerMonth * BAHT,
		frequency: "monthly",
		start: "2026-01-31",
		growth: { bps: 0 },
	}
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "fund", kind: "asset", rate: 0 },
		],
		flows: rmfPerMonth === 0 ? [salary] : [salary, saving],
		cashflow: { surplus: [{ account: "cash" }], contribute: ["fund"], withdraw: ["cash"] },
		levies: [levy],
	}
}

/** The Projection's 2026 Settlement period for the plan, and what raising RMF then SSF would save. */
function suggest(rmfPerMonth: number) {
	const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] } as const
	const timeline = { start: "2026-01-01", horizon: "2027-03-31", resolution: "month" } as const
	const result = project(baseline, plan(rmfPerMonth), timeline)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const period = result.projection.levies?.[0]?.periods.find((item) => item.from === "2026-01-01")
	const said = contributionSavings(levy, period as SettlementPeriod, {
		labels: [RMF, SSF],
		step: STEP,
		grain: BAHT,
		inflation: 0,
		maxSteps: 100,
	})
	if (!said.ok) throw new Error(JSON.stringify(said.problem))
	return said.labels.map((item) => [item.plannedFunded, item.extra])
}

describe("contributionSavings on the emitted Thai Levy, through project()", () => {
	// Salary 1,200,000: RMF is capped at 30% of it, 360,000; RMF and SSF share the 500,000 cluster.
	it("stops RMF below its 360,000 cap, and SSF within the cluster's room, from nothing planned", () => {
		// 7 RMF steps end at 350,000 (the 8th, to 400,000, goes past the cap and is dropped); 150,000 of
		// SSF fills the 500,000 cluster exactly.
		expect(suggest(0)).toEqual([
			[0, 35_000_000],
			[0, 15_000_000],
		])
	})

	it("drops the RMF step that would end at 362,000, from 1,000 a month planned", () => {
		// 12,000 planned + 300,000 = 312,000; one more step ends at 362,000, 2,000 over the cap.
		// SSF then has 500,000 - 312,000 = 188,000 of room: 3 steps (150,000); a 4th, to 200,000, is past it.
		expect(suggest(1_000)).toEqual([
			[1_200_000, 30_000_000],
			[0, 15_000_000],
		])
	})

	it("keeps the step that ends exactly on the cap, and gives SSF only the 140,000 of room left", () => {
		// 60,000 planned (5,000 a month) + 6 steps of 50,000 = 360,000, the cap, which the last baht
		// still fills. SSF has 500,000 - 360,000 = 140,000: 2 steps; the 3rd, to 150,000, is past it.
		expect(suggest(5_000)).toEqual([
			[6_000_000, 30_000_000],
			[0, 10_000_000],
		])
	})
})
