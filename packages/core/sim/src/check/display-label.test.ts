import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { thaiEmployee } from "../fixtures/thai-employee"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const accounts = [{ id: "cash", kind: "asset", rate: 0 }]
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const FLOW = {
	id: "gym",
	kind: "expense",
	amount: 500,
	frequency: "monthly",
	start: "2026-02-01",
	growth: { bps: 0 },
}
const MILESTONE = {
	id: "retired",
	combine: "all",
	criteria: [{ id: "d", kind: "date", on: "2026-06-01" }],
}

/** The problems of one document, as `path code` strings, so a label's path is exact. */
function problemsOf(scenario: Record<string, unknown>): string[] {
	return check(baseline, scenario, timeline).map(
		(problem) => `${problem.path.join("/")} ${problem.code}`,
	)
}

function scenarioOf(flow: unknown, milestone: unknown = undefined): Record<string, unknown> {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [flow],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		...(milestone === undefined ? {} : { milestones: [milestone] }),
	}
}

const withFlowLabel = (displayLabel: unknown) => problemsOf(scenarioOf({ ...FLOW, displayLabel }))
const withMilestoneLabel = (displayLabel: unknown) =>
	problemsOf(scenarioOf(FLOW, { ...MILESTONE, displayLabel }))

describe("a Flow's display label is optional free text of 1 to 80 code points", () => {
	it("accepts a plain label, and one of exactly 80 code points", () => {
		expect(withFlowLabel("Gym membership")).toEqual([])
		expect(withFlowLabel("a".repeat(80))).toEqual([])
	})

	it("counts code points, not UTF-16 units: 80 emoji fit", () => {
		expect(withFlowLabel("🙂".repeat(80))).toEqual([])
	})

	it("refuses 81 code points at the label's path", () => {
		expect(withFlowLabel("a".repeat(81))).toEqual(["scenario/flows/0/displayLabel INVALID_LABEL"])
		expect(withFlowLabel("🙂".repeat(81))).toEqual(["scenario/flows/0/displayLabel INVALID_LABEL"])
	})

	it("refuses empty text, edge whitespace and a control character", () => {
		expect(withFlowLabel("")).toEqual(["scenario/flows/0/displayLabel INVALID_LABEL"])
		expect(withFlowLabel(" Gym")).toEqual(["scenario/flows/0/displayLabel INVALID_LABEL"])
		expect(withFlowLabel("Gym\n")).toEqual(["scenario/flows/0/displayLabel INVALID_LABEL"])
		expect(withFlowLabel("G\u0007ym")).toEqual(["scenario/flows/0/displayLabel INVALID_LABEL"])
	})

	it("refuses a non-string label as WRONG_TYPE", () => {
		expect(withFlowLabel(5)).toEqual(["scenario/flows/0/displayLabel WRONG_TYPE"])
	})

	it("takes a label on every Flow kind, since it is part of the Flow's base", () => {
		const income = {
			id: "salary",
			kind: "income",
			earned: true,
			amount: 500,
			frequency: "monthly",
			start: "2026-02-01",
			growth: { bps: 0 },
			displayLabel: "Salary",
		}
		expect(problemsOf(scenarioOf(income))).toEqual([])
	})

	it("accepts a Milestone label, and refuses a long one at its path", () => {
		expect(withMilestoneLabel("Retired")).toEqual([])
		expect(withMilestoneLabel("a".repeat(81))).toEqual([
			"scenario/milestones/0/displayLabel INVALID_LABEL",
		])
	})
})

describe("the engine's figures are the same with and without a label", () => {
	it("projects one plan identically when a Flow and a Milestone carry a label", () => {
		const milestone = {
			id: "rich",
			combine: "all" as const,
			criteria: [{ id: "d", kind: "date" as const, on: "2030-01-01" }],
		}
		const bare = { ...thaiEmployee.scenario, milestones: [milestone] }
		const labelled = {
			...bare,
			flows: bare.flows.map((flow) => ({ ...flow, displayLabel: "A label" })),
			milestones: [{ ...milestone, displayLabel: "Rich at last" }],
		}
		const first = project(thaiEmployee.baseline, bare, thaiEmployee.timeline)
		const second = project(thaiEmployee.baseline, labelled, thaiEmployee.timeline)
		expect(second).toEqual(first)
	})
})
