import { describe, expect, it } from "bun:test"
import { thaiEmployee } from "../fixtures/thai-employee"
import { expected, problemsFor } from "../testing"

const at = ["scenario", "milestones"] as const

/** A metric Milestone on net worth, valid on its own. */
const metric = (id: string, metricValue: unknown = "netWorth") => ({
	id,
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: metricValue, op: "atLeast", amount: 100, terms: "nominal" },
	],
})

/** The problems of a Scenario whose `milestones` is `list`. */
const withList = (list: unknown) => problemsFor({ scenario: [["milestones"], list] })

describe("check() accepts a valid Milestone and refuses the rest with exact paths", () => {
	it("accepts Milestones, a Flow gated on one, and a date, metric and multiple criterion", () => {
		const list = [
			metric("rich"),
			{
				id: "later",
				combine: "any",
				criteria: [
					{ id: "d", kind: "date", on: "2030-01-01" },
					{ id: "m", kind: "milestone", milestone: "rich", months: 12 },
					{
						id: "x",
						kind: "multiple",
						metric: { accounts: ["cash"] },
						op: "atMost",
						base: { expenses: "next12Months" },
						num: 25,
						den: 1,
						terms: "real",
					},
				],
			},
		]
		const flows = [
			{ ...thaiEmployee.scenario.flows[0], startAt: "rich" },
			...thaiEmployee.scenario.flows.slice(1),
		]
		const scenario = { ...thaiEmployee.scenario, milestones: list, flows }
		expect(problemsFor({ scenario: [[], scenario] })).toEqual([])
	})

	it("refuses an empty milestones list, and an empty criteria list", () => {
		expect(withList([])).toEqual(expected("MISSING_KEY", at))
		expect(withList([{ ...metric("a"), criteria: [] }])).toEqual(
			expected("MISSING_KEY", [...at, 0, "criteria"]),
		)
	})

	it("refuses a duplicate Milestone id at the second declaration", () => {
		expect(withList([metric("a"), metric("a")])).toEqual(expected("DUPLICATE_ID", [...at, 1, "id"]))
	})

	it("refuses an unknown combine", () => {
		expect(withList([{ ...metric("a"), combine: "either" }])).toEqual(
			expected("INVALID_COMBINE", [...at, 0, "combine"]),
		)
	})

	it("refuses an unknown criterion kind", () => {
		const list = [{ ...metric("a"), criteria: [{ id: "c", kind: "event", on: "2030-01-01" }] }]
		expect(withList(list)).toEqual(expected("INVALID_KIND", [...at, 0, "criteria", 0, "kind"]))
	})

	it("refuses an unknown metric name", () => {
		expect(withList([metric("a", "wealth")])).toEqual(
			expected("INVALID_METRIC", [...at, 0, "criteria", 0, "metric"]),
		)
	})

	it("refuses an empty accounts list and a metric with both fields", () => {
		expect(withList([metric("a", { accounts: [] })])).toEqual(
			expected("INVALID_METRIC", [...at, 0, "criteria", 0, "metric", "accounts"]),
		)
		expect(withList([metric("a", { accounts: ["cash"], expenses: "next12Months" })])).toEqual(
			expected("INVALID_METRIC", [...at, 0, "criteria", 0, "metric"]),
		)
	})

	it("refuses an account id the Scenario does not declare", () => {
		expect(withList([metric("a", { accounts: ["nope"] })])).toEqual(
			expected("UNKNOWN_ACCOUNT", [...at, 0, "criteria", 0, "metric", "accounts", 0]),
		)
	})

	it("refuses accounts of two kinds in one metric", () => {
		expect(withList([metric("a", { accounts: ["cash", "mortgage"] })])).toEqual(
			expected("MIXED_METRIC_ACCOUNTS", [...at, 0, "criteria", 0, "metric", "accounts"]),
		)
	})

	it("refuses an unknown comparison", () => {
		const list = [{ ...metric("a"), criteria: [{ ...criterionOf(metric("a")), op: "equal" }] }]
		expect(withList(list)).toEqual(expected("INVALID_COMPARISON", [...at, 0, "criteria", 0, "op"]))
	})

	it("refuses terms other than nominal or real", () => {
		const list = [{ ...metric("a"), criteria: [{ ...criterionOf(metric("a")), terms: "usd" }] }]
		expect(withList(list)).toEqual(expected("INVALID_TERMS", [...at, 0, "criteria", 0, "terms"]))
	})

	it("refuses a multiple whose numerator is not positive", () => {
		const multiple = {
			id: "c",
			kind: "multiple",
			metric: "netWorth",
			op: "atLeast",
			base: { expenses: "next12Months" },
			num: 0,
			den: 1,
			terms: "nominal",
		}
		const list = [{ ...metric("a"), criteria: [multiple] }]
		expect(withList(list)).toEqual(expected("INVALID_MULTIPLE", [...at, 0, "criteria", 0, "num"]))
	})

	it("refuses a multiple whose denominator is not positive", () => {
		const multiple = {
			id: "c",
			kind: "multiple",
			metric: "netWorth",
			op: "atLeast",
			base: { expenses: "next12Months" },
			num: 1,
			den: 0,
			terms: "nominal",
		}
		const list = [{ ...metric("a"), criteria: [multiple] }]
		expect(withList(list)).toEqual(
			expected("INVALID_DENOMINATOR", [...at, 0, "criteria", 0, "den"]),
		)
	})

	it("refuses a reference to a Milestone the Scenario does not declare", () => {
		const list = [
			{
				id: "a",
				combine: "all",
				criteria: [{ id: "c", kind: "milestone", milestone: "ghost", months: 0 }],
			},
		]
		expect(withList(list)).toEqual(
			expected("UNKNOWN_MILESTONE", [...at, 0, "criteria", 0, "milestone"]),
		)
	})

	it("refuses a Flow whose startAt names no Milestone", () => {
		expect(problemsFor({ scenario: [["flows", 0, "startAt"], "rich"] })).toEqual(
			expected("UNKNOWN_MILESTONE", ["scenario", "flows", 0, "startAt"]),
		)
	})

	it("reports a reference cycle at the reference that closes it", () => {
		const list = [
			{ id: "a", combine: "all", criteria: [milestoneRef("b", 0)] },
			{ id: "b", combine: "all", criteria: [milestoneRef("a", 0)] },
		]
		expect(withList(list)).toEqual(
			expected("MILESTONE_CYCLE", [...at, 1, "criteria", 0, "milestone"]),
		)
	})

	it("refuses a negative offset from a dynamic Milestone, at its months", () => {
		const list = [metric("rich"), { id: "b", combine: "all", criteria: [milestoneRef("rich", -6)] }]
		expect(withList(list)).toEqual(
			expected("MILESTONE_LOOKAHEAD", [...at, 1, "criteria", 0, "months"]),
		)
	})

	it("accepts a negative offset from a static Milestone", () => {
		const list = [
			{ id: "a", combine: "all", criteria: [{ id: "c", kind: "date", on: "2030-01-01" }] },
			{ id: "b", combine: "all", criteria: [milestoneRef("a", -6)] },
		]
		expect(withList(list)).toEqual([])
	})

	it("refuses an unknown key on a criterion", () => {
		const list = [{ ...metric("a"), criteria: [{ ...criterionOf(metric("a")), extra: 1 }] }]
		expect(withList(list)).toEqual(expected("UNKNOWN_KEY", [...at, 0, "criteria", 0, "extra"]))
	})
})

function criterionOf(milestone: {
	readonly criteria: readonly unknown[]
}): Record<string, unknown> {
	return milestone.criteria[0] as Record<string, unknown>
}

function milestoneRef(to: string, months: number) {
	return { id: "c", kind: "milestone", milestone: to, months }
}
