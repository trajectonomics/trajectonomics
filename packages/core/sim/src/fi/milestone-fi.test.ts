import { describe, expect, it } from "bun:test"
import { addDays } from "../calendar/arith"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Flow, Milestone, Scenario, Timeline } from "../types"
import { candidateMonths } from "./candidates"
import { financialIndependence } from "./financial-independence"

/**
 * Earned salary 1,000 and living 600 on each 1st from 1 Jan 2026. Cash starts at zero, so the plan
 * builds 400 a month while earning. Living stops on 1 Jan 2028 only when `gated` is set.
 */
function plan(gated: boolean): { readonly scenario: Scenario; readonly timeline: Timeline } {
	const living = expense("living", 600, { frequency: "monthly", start: "2026-01-01" })
	const flows: Flow[] = [
		income("salary", 1000, { frequency: "monthly", start: "2026-01-01" }),
		gated ? { ...living, endAt: "stop" } : living,
	]
	const stop: Milestone = {
		id: "stop",
		combine: "all",
		criteria: [{ id: "c", kind: "date", on: "2028-01-01" }],
	}
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2032-01-01",
		resolution: "month",
	})
	const scenario: Scenario = gated ? { ...fixture.scenario, milestones: [stop] } : fixture.scenario
	return { scenario, timeline: fixture.timeline }
}

/**
 * The brute-force answer: the first candidate month whose re-projection, with earned income ended
 * the day before it, runs no short. Each candidate is a fresh full projection, with no shared state.
 */
function bruteForce(gated: boolean): string | undefined {
	const { scenario, timeline } = plan(gated)
	const baseline = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2032-01-01",
	}).baseline
	for (const month of candidateMonths(timeline)) {
		const ended = scenario.flows.map((flow) =>
			flow.kind === "income" && flow.earned ? { ...flow, end: addDays(month, -1) } : flow,
		)
		const result = project(baseline, { ...scenario, flows: ended }, timeline)
		if (result.ok && result.projection.runsOut === undefined) return month
	}
	return undefined
}

function fiMonth(gated: boolean): string | undefined {
	const { scenario, timeline } = plan(gated)
	const baseline = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2032-01-01",
	}).baseline
	const result = financialIndependence(baseline, scenario, timeline, { method: "survival" })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.financialIndependence.reachable ? result.financialIndependence.month : undefined
}

describe("the FI scan applies Milestone gates on every candidate walk", () => {
	it("moves the FI month earlier when a gate stops the living expense, as the brute-force walk does", () => {
		// With living ending 1 Jan 2028: the plan needs 15 months of saving (6,000 against 5,400).
		expect(fiMonth(true)).toBe("2027-04-01")
		expect(bruteForce(true)).toBe("2027-04-01")
	})

	it("keeps the ungated answer, which needs 44 months of saving to the horizon", () => {
		expect(fiMonth(false)).toBe("2029-09-01")
		expect(bruteForce(false)).toBe("2029-09-01")
	})
})

/**
 * Earned salary 1,000 and living 600 from 1 Jan 2026, and an earned bonus of 50,000 that starts
 * 1 Jan 2026 but waits on 'rich': opening net worth first reaches 2,400 on 1 Jul 2026. An FI stop
 * at or before 1 Jul ends the earned bonus with the rest of the earned income.
 */
function bonusPlan(): { readonly scenario: Scenario; readonly timeline: Timeline } {
	const rich: Milestone = {
		id: "rich",
		combine: "all",
		criteria: [
			{
				id: "c",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 2400,
				terms: "nominal",
			},
		],
	}
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		flows: [
			income("salary", 1000, { frequency: "monthly", start: "2026-01-01" }),
			expense("living", 600, { frequency: "monthly", start: "2026-01-01" }),
			income("bonus", 50000, { frequency: "once", start: "2026-01-01", startAt: "rich" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2032-01-01",
		resolution: "month",
	})
	return { scenario: { ...fixture.scenario, milestones: [rich] }, timeline: fixture.timeline }
}

/** The bonus is earned, so a candidate that stops on or before its fire date never receives it. */
function bonusBruteForce(): string | undefined {
	const { scenario, timeline } = bonusPlan()
	const baseline = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2032-01-01",
	}).baseline
	for (const month of candidateMonths(timeline)) {
		const ended = scenario.flows
			.filter((flow) => !(flow.id === "bonus" && month <= "2026-07-01"))
			.map((flow) =>
				flow.kind === "income" && flow.earned && flow.id === "salary"
					? { ...flow, end: addDays(month, -1) }
					: flow,
			)
		const result = project(baseline, { ...scenario, flows: ended }, timeline)
		if (result.ok && result.projection.runsOut === undefined) return month
	}
	return undefined
}

describe("an earned Flow that waits on a dynamic Milestone stops with the earned income", () => {
	it("does not land for a candidate stopping on or before the fire date", () => {
		// Without the stop, the first candidate (1 Jan) would wrongly pass with the bonus.
		const { scenario, timeline } = bonusPlan()
		const baseline = makeFixture({
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			balances: { cash: 0 },
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			start: "2026-01-01",
			horizon: "2032-01-01",
		}).baseline
		const result = financialIndependence(baseline, scenario, timeline, { method: "survival" })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.financialIndependence.reachable && result.financialIndependence.month).toBe(
			"2026-08-01",
		)
		expect(bonusBruteForce()).toBe("2026-08-01")
	})
})
