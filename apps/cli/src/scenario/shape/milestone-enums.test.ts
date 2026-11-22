import { describe, expect, it } from "bun:test"
import { scenarioExample } from "./index"
import { METRIC_NAMES, REFERENCE_WINDOWS } from "./terms"
import { canonical, documented, nodeAt, type Path, probed, refusalsOf, VERSION } from "./testing"

/*
 * The closed value sets a Milestone states (sim's ADR 0012), probed against the pinned core as
 * enums.test.ts probes the rest: each listed value is accepted where the set lives, and a value
 * outside it is refused there by the core's code. A Metric's names and windows sit under `anyOf`,
 * which the path walk does not reach, so they are probed at the end of this file.
 */

const CASH = { id: "cash", kind: "asset", rate: 0 }
const EXPENSE = { kind: "expense", amount: 1, frequency: "monthly", growth: { bps: 0 } }

/** The example Scenario with one expense Flow and the Milestones given, so only they vary. */
function probe(milestones: unknown[]): Record<string, unknown> {
	return {
		...scenarioExample(VERSION ?? 0),
		accounts: [CASH],
		flows: [{ id: "flow", start: "2026-01-01", ...EXPENSE }],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
		milestones,
	}
}

type EnumProbe = {
	path: Path
	/** One document per listed value, all accepted, together covering the whole set. */
	accepted: () => unknown[]
	/** A document that puts a value outside the set where the set lives. */
	refused: () => unknown
	code: string
}

const DATE_CRITERION = { id: "probe", kind: "date", on: "2045-01-01" }
const METRIC_CRITERION = {
	id: "probe",
	kind: "metric",
	metric: "netWorth",
	op: "atLeast",
	amount: 1,
	terms: "nominal",
}

/** The fields each criterion kind carries, so a probe for `kind` is valid except for the kind. */
const CRITERION_BODY: Record<string, Record<string, unknown>> = {
	date: { on: "2045-01-01" },
	milestone: { milestone: "later", months: 0 },
	metric: { metric: "netWorth", op: "atLeast", amount: 1, terms: "nominal" },
	multiple: {
		metric: "netWorth",
		op: "atLeast",
		base: "netWorth",
		num: 1,
		den: 1,
		terms: "nominal",
	},
}

/**
 * A Scenario whose first Milestone holds `criteria` under `combine`, with a second, date-fired
 * Milestone named `later` for a criterion to read. A probe that is not about the Milestone's fire
 * order never makes a cycle, so the core's graph check passes it.
 */
function milestoneProbe(
	combine: string,
	criteria: Record<string, unknown>[],
): Record<string, unknown> {
	const milestones = [
		{ id: "probe", combine, criteria },
		{ id: "later", combine: "all", criteria: [{ id: "date", kind: "date", on: "2045-01-01" }] },
	]
	return probe(milestones)
}

const MILESTONE_PROBES: EnumProbe[] = [
	{
		path: ["milestones", 0, "combine"],
		accepted: () =>
			(nodeAt(["milestones", 0, "combine"])["enum"] as string[]).map((combine) =>
				milestoneProbe(combine, [DATE_CRITERION]),
			),
		refused: () => milestoneProbe("either", [DATE_CRITERION]),
		code: "INVALID_COMBINE",
	},
	{
		path: ["milestones", 0, "criteria", 0, "kind"],
		accepted: () =>
			(nodeAt(["milestones", 0, "criteria", "*", "kind"])["enum"] as string[]).map((kind) =>
				milestoneProbe("all", [{ id: "probe", kind, ...CRITERION_BODY[kind] }]),
			),
		refused: () => milestoneProbe("all", [{ id: "probe", kind: "sometime", on: "2045-01-01" }]),
		code: "INVALID_KIND",
	},
	{
		path: ["milestones", 0, "criteria", 0, "op"],
		accepted: () =>
			(nodeAt(["milestones", 0, "criteria", "*", "op"])["enum"] as string[]).map((op) =>
				milestoneProbe("all", [{ ...METRIC_CRITERION, op }]),
			),
		refused: () => milestoneProbe("all", [{ ...METRIC_CRITERION, op: "between" }]),
		code: "INVALID_COMPARISON",
	},
	{
		path: ["milestones", 0, "criteria", 0, "terms"],
		accepted: () =>
			(nodeAt(["milestones", 0, "criteria", "*", "terms"])["enum"] as string[]).map((terms) =>
				milestoneProbe("all", [{ ...METRIC_CRITERION, terms }]),
			),
		refused: () => milestoneProbe("all", [{ ...METRIC_CRITERION, terms: "decimal" }]),
		code: "INVALID_TERMS",
	},
]

describe("the milestone value sets the shape states", () => {
	const milestoneDocumented = () =>
		documented().filter(
			(entry) =>
				Array.isArray(entry.node["enum"]) && canonical(entry.path).startsWith("milestones."),
		)

	it("covers every one of them with a probe", () => {
		expect(
			milestoneDocumented()
				.map((entry) => canonical(entry.path))
				.sort(),
		).toEqual(MILESTONE_PROBES.map((entry) => canonical(entry.path)).sort())
	})

	it("states every value each set accepts, and only those", () => {
		for (const entry of MILESTONE_PROBES) {
			const values = nodeAt(entry.path)["enum"] as string[]
			const documents = entry.accepted()
			expect(documents).toHaveLength(values.length)
			for (const document of documents) expect(refusalsOf(document)).toEqual([])
			const probedValues = documents.map((document) => readAt(document, entry.path))
			expect([...probedValues].sort()).toEqual([...values].sort())
		}
	})

	it("refuses a value outside each set it states, at that field", () => {
		for (const entry of MILESTONE_PROBES) {
			expect(refusalsOf(entry.refused())).toContainEqual({
				code: entry.code,
				path: probed(entry.path),
			})
		}
	})
})

/** The value at a path whose indices are written out, as the probes place them. */
function readAt(value: unknown, path: Path): unknown {
	return path.reduce<unknown>(
		(current, segment) => (current as Record<string, unknown>)[String(segment)],
		value,
	)
}

/*
 * A Metric is written as one of several shapes, so its closed sets sit under `anyOf` where the
 * path walk above does not reach. Each set is read from the schema and probed here instead.
 */
describe("the Metric names and windows a criterion may read", () => {
	const metricNode = (): Record<string, unknown> =>
		nodeAt(["milestones", 0, "criteria", 0, "metric"])
	const branchEnum = (index: number): string[] =>
		((metricNode()["anyOf"] as Record<string, unknown>[])[index]?.["enum"] ?? []) as string[]
	const expensesWindow = (): string[] =>
		(
			((metricNode()["anyOf"] as Record<string, unknown>[])[2]?.["properties"] ?? {}) as Record<
				string,
				{ enum?: string[] }
			>
		)["expenses"]?.enum ?? []

	it("publishes the named balances and the expense windows the core accepts", () => {
		expect(branchEnum(0)).toEqual([...METRIC_NAMES])
		expect(expensesWindow()).toEqual([...REFERENCE_WINDOWS])
	})

	it("accepts every named balance and window, and refuses one outside each set", () => {
		for (const name of METRIC_NAMES) {
			expect(refusalsOf(metricProbe(name))).toEqual([])
		}
		for (const window of REFERENCE_WINDOWS) {
			expect(refusalsOf(metricProbe({ expenses: window }))).toEqual([])
		}
		expect(refusalsOf(metricProbe("cash"))).toContainEqual({
			code: "INVALID_METRIC",
			path: "milestones.0.criteria.0.metric",
		})
		expect(refusalsOf(metricProbe({ expenses: "last12Months" }))).toContainEqual({
			code: "INVALID_METRIC",
			path: "milestones.0.criteria.0.metric.expenses",
		})
	})
})

/** A Scenario whose first criterion reads `metric`, so the metric is the only thing it varies. */
function metricProbe(metric: unknown): Record<string, unknown> {
	return milestoneProbe("all", [
		{ id: "probe", kind: "metric", metric, op: "atLeast", amount: 1, terms: "nominal" },
	])
}
