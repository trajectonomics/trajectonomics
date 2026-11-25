import { describe, expect, it } from "bun:test"
import { scenarioExample } from "./index"
import { nodeAt, probed, refusalsOf, VERSION } from "./testing"

/*
 * The two closed sets a Spending rule states (sim ADR 0023): its kind and its rounding. They are
 * probed here against the pinned core, as every other closed set is in enums.test.ts, which leaves
 * `flows.*.rule.*` to this file.
 */

const CASH = { id: "cash", kind: "asset", rate: 0 }

/** A Scenario with one expense Flow under a rule that is valid for its kind, with `patch` applied to the rule. */
function ruleDocument(patch: Record<string, unknown>): Record<string, unknown> {
	return {
		...scenarioExample(VERSION ?? 0),
		estate: {},
		accounts: [CASH],
		flows: [
			{
				id: "spending",
				kind: "expense",
				frequency: "monthly",
				start: "2026-01-01",
				rule: {
					kind: "initialRate",
					portfolio: ["cash"],
					rateBps: 400,
					rounding: "floor",
					...patch,
				},
			},
		],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	}
}

/** The one rule key each kind needs beyond the shared four: `guardrails` needs a band. */
const EXTRA: Record<string, Record<string, unknown>> = {
	guardrails: { upper: { bps: 2000, adjustBps: 1000 } },
}

describe("the kinds a spending rule states", () => {
	const path = ["flows", "*", "rule", "kind"]

	it("states every kind the core accepts, and only those", () => {
		const values = nodeAt(path)["enum"] as string[]
		expect([...values].sort()).toEqual(["currentRate", "guardrails", "initialRate"])
		for (const kind of values) {
			expect(refusalsOf(ruleDocument({ kind, ...EXTRA[kind] })), kind).toEqual([])
		}
	})

	it("refuses a kind outside the set, at that field", () => {
		expect(refusalsOf(ruleDocument({ kind: "fixedShare" }))).toContainEqual({
			code: "INVALID_KIND",
			path: probed(["flows", 0, "rule", "kind"]),
		})
	})
})

describe("the rounding a spending rule states", () => {
	const path = ["flows", "*", "rule", "rounding"]

	it("states every rounding the core accepts, and only those", () => {
		const values = nodeAt(path)["enum"] as string[]
		expect(values.length).toBeGreaterThan(0)
		for (const rounding of values) expect(refusalsOf(ruleDocument({ rounding }))).toEqual([])
	})

	it("refuses a rounding outside the set, and a rule with none, at that field", () => {
		expect(refusalsOf(ruleDocument({ rounding: "down" }))).toContainEqual({
			code: "INVALID_ROUNDING",
			path: probed(["flows", 0, "rule", "rounding"]),
		})
		const missing = ruleDocument({})
		const flow = (missing["flows"] as { rule: Record<string, unknown> }[])[0]
		if (flow !== undefined) delete flow.rule["rounding"]
		expect(refusalsOf(missing)).toContainEqual({
			code: "MISSING_KEY",
			path: probed(["flows", 0, "rule", "rounding"]),
		})
	})
})
