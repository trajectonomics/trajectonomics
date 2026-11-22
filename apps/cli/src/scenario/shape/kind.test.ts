import { describe, expect, it } from "bun:test"
import { scenarioExample } from "./index"
import { nodeAt, type Path, refusalsOf, VERSION } from "./testing"

/*
 * The keys the shape states for one kind only. Each is a claim in a description ("Assets only",
 * "Income only", "Contribution only"), so each is probed: the core refuses that key on the other
 * kind, at that key. A key the kind's own shape does not declare is UNKNOWN_KEY; one the Flow shape
 * declares but that kind does not use is FIELD_NOT_ALLOWED.
 */

const VERSION_NUMBER = VERSION ?? 0
const CASH = { id: "cash", kind: "asset", rate: 0 }
const EXPENSE = { id: "flow", kind: "expense", amount: 1, frequency: "monthly", growth: { bps: 0 } }

/** A Scenario with the Accounts and Flows a probe needs, and the Levy that makes a label readable. */
function documentOf(input: {
	accounts?: Record<string, unknown>[]
	flows?: Record<string, unknown>[]
}): Record<string, unknown> {
	return {
		...scenarioExample(VERSION_NUMBER),
		accounts: input.accounts ?? [CASH],
		flows: (input.flows ?? [EXPENSE]).map((flow) => ({ start: "2026-01-01", ...flow })),
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
		levies: [
			{
				id: "th-2026",
				period: { month: 1, day: 1 },
				settlement: { month: 4, day: 30 },
				measures: [{ id: "due", op: "const", value: 0 }],
				due: "due",
			},
		],
	}
}

/** One Account key only an asset may carry: its path, the description that says so, its value. */
const ASSET_ONLY: { key: string; value: unknown; statement: string }[] = [
	{ key: "lockedUntil", value: "2051-01-01", statement: "Assets only" },
	{ key: "returnLabel", value: "returns.index", statement: "Assets only" },
	{ key: "gainLabel", value: "gains.index", statement: "Assets only" },
]

/** One Flow key a kind refuses, with the code the core uses for that kind's own shape. */
const FLOW_KIND_ONLY: {
	key: string
	value: unknown
	statement: string
	code: string
}[] = [
	{ key: "earned", value: true, statement: "Income only", code: "UNKNOWN_KEY" },
	{ key: "target", value: "cash", statement: "Contribution only", code: "UNKNOWN_KEY" },
	{
		key: "label",
		value: "income.section40_1",
		statement: "Income and contribution only",
		code: "FIELD_NOT_ALLOWED",
	},
	{ key: "prepayments", value: [], statement: "Income only", code: "FIELD_NOT_ALLOWED" },
	{
		key: "cappedPrepayment",
		value: { levy: "th-2026", bps: 500, upTo: "due" },
		statement: "Income only",
		code: "FIELD_NOT_ALLOWED",
	},
]

describe("the keys the shape states for one kind only", () => {
	it("says which kind each of them belongs to, in its own description", () => {
		for (const entry of ASSET_ONLY) {
			expect(String(nodeAt(["accounts", 0, entry.key])["description"])).toContain(entry.statement)
		}
		for (const entry of FLOW_KIND_ONLY) {
			expect(String(nodeAt(["flows", 0, entry.key])["description"])).toContain(entry.statement)
		}
	})

	it("refuses an asset-only key on a liability, at that key", () => {
		for (const entry of ASSET_ONLY) {
			const refusals = refusalsOf(
				documentOf({
					accounts: [CASH, { id: "loan", kind: "liability", rate: 500, [entry.key]: entry.value }],
				}),
			)
			const path: Path = ["accounts", 1, entry.key]
			expect(refusals).toContainEqual({
				code: "LIABILITY_MISUSE",
				path: path.join("."),
			})
		}
	})

	it("refuses a Flow key on a kind that does not take it, at that key", () => {
		for (const entry of FLOW_KIND_ONLY) {
			const refusals = refusalsOf(documentOf({ flows: [{ ...EXPENSE, [entry.key]: entry.value }] }))
			expect(refusals).toContainEqual({
				code: entry.code,
				path: ["flows", 0, entry.key].join("."),
			})
		}
	})
})

/*
 * The criterion keys one kind uses. A criterion's `kind` decides its keys (milestone.ts), so a key
 * placed on another kind is UNKNOWN_KEY at that key, and its description says which kind it is for.
 */
const DATE_CRITERION = { id: "c", kind: "date", on: "2045-01-01" }
const METRIC_CRITERION = {
	id: "c",
	kind: "metric",
	metric: "netWorth",
	op: "atLeast",
	amount: 1,
	terms: "nominal",
}

const CRITERION_KIND_ONLY: { key: string; value: unknown; statement: string; placed: object }[] = [
	{ key: "on", value: "2045-01-01", statement: "Date criterion only", placed: METRIC_CRITERION },
	{ key: "milestone", value: "m", statement: "Milestone criterion only", placed: DATE_CRITERION },
	{ key: "months", value: 0, statement: "Milestone criterion only", placed: DATE_CRITERION },
	{
		key: "metric",
		value: "netWorth",
		statement: "Metric and multiple criteria only",
		placed: DATE_CRITERION,
	},
	{
		key: "op",
		value: "atLeast",
		statement: "Metric and multiple criteria only",
		placed: DATE_CRITERION,
	},
	{
		key: "terms",
		value: "nominal",
		statement: "Metric and multiple criteria only",
		placed: DATE_CRITERION,
	},
	{ key: "amount", value: 1, statement: "Metric criteria only", placed: DATE_CRITERION },
	{ key: "base", value: "netWorth", statement: "Multiple criteria only", placed: METRIC_CRITERION },
	{ key: "num", value: 1, statement: "Multiple criteria only", placed: METRIC_CRITERION },
	{ key: "den", value: 1, statement: "Multiple criteria only", placed: METRIC_CRITERION },
]

/** A Scenario whose one Milestone holds `criterion` as its first criterion. */
function withCriterion(criterion: object): Record<string, unknown> {
	return {
		...documentOf({}),
		milestones: [{ id: "m", combine: "all", criteria: [criterion] }],
	}
}

describe("the criterion keys one kind uses", () => {
	it("says which kind each of them belongs to, in its own description", () => {
		for (const entry of CRITERION_KIND_ONLY) {
			const criterionKey = ["milestones", 0, "criteria", 0, entry.key] as Path
			expect(String(nodeAt(criterionKey)["description"])).toContain(entry.statement)
		}
	})

	it("refuses a criterion key on a kind that does not take it, at that key", () => {
		for (const entry of CRITERION_KIND_ONLY) {
			const criterion = { ...entry.placed, [entry.key]: entry.value }
			expect(refusalsOf(withCriterion(criterion))).toContainEqual({
				code: "UNKNOWN_KEY",
				path: ["milestones", 0, "criteria", 0, entry.key].join("."),
			})
		}
	})
})
