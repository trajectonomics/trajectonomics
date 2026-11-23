import { describe, expect, it } from "bun:test"
import { contribution, derivedContribution, derivedExpense } from "../engine/test-flows"
import { makeFixture, problems, type Setup } from "../engine/test-helpers"
import type { Derive, Flow } from "../types"
import type { Problem } from "./codes"
import { check } from "./index"
import { LEVY_RULES, measure } from "./measure"

const ACCOUNTS: Setup["accounts"] = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 300 },
]

const upkeep = (account: string): Derive => ({
	measures: [
		{ id: "value", op: "account", account },
		{ id: "share", op: "scale", of: "value", num: 100, den: 120_000, rounding: "halfUp" },
	],
	result: "share",
})

const setup = (flows: readonly Flow[], extra: Partial<Setup> = {}): Setup => ({
	accounts: ACCOUNTS,
	balances: { cash: 1_000_000_000, home: 500_000_000 },
	flows,
	surplus: [{ account: "cash" }],
	contribute: ["home"],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-31",
	...extra,
})

const once = { frequency: "once", start: "2026-01-01" } as const

describe("Derived amounts that read an Account", () => {
	it("refuses an Account the Scenario does not declare, at the Measure that reads it", () => {
		const found = problems(setup([derivedExpense("upkeep", upkeep("nope"), once)]))
		expect(found).toContainEqual({
			code: "UNKNOWN_ACCOUNT",
			path: ["scenario", "flows", 0, "derive", "measures", 0, "account"],
		})
	})

	it("refuses an Account read in a Levy's Measure at the Measure's own path", () => {
		const found: Problem[] = []
		const emit = (code: Problem["code"], path: Problem["path"]) => found.push({ code, path })
		const path = ["scenario", "levies", 0, "measures", 2] as const
		measure(LEVY_RULES)({ id: "home", op: "account", account: "home" }, path, emit)
		expect(found).toEqual([{ code: "ACCOUNT_MEASURE_IN_LEVY", path: [...path] }])
	})

	it("refuses a Flow that reads the Account it changes, a self-reference through the Account", () => {
		const save = derivedContribution("save", "home", upkeep("home"), once)
		expect(problems(setup([save]))).toContainEqual({
			code: "FLOW_CYCLE",
			path: ["scenario", "flows", 0, "derive", "measures", 0, "account"],
		})
	})

	it("refuses a cycle through two Flows: one reads the Account, the other changes it from that read", () => {
		const drain = derivedExpense("drain", upkeep("home"), once)
		const save = derivedContribution(
			"save",
			"home",
			{
				measures: [
					{ id: "source", op: "flow", flow: "drain" },
					{ id: "result", op: "scale", of: "source", num: 1, den: 1, rounding: "halfUp" },
				],
				result: "result",
			},
			once,
		)
		expect(problems(setup([drain, save])).map((item) => item.code)).toContain("FLOW_CYCLE")
	})

	it("accepts a read of an Account that another Flow changes with no way back", () => {
		const fixed = contribution("save", "home", 1_000, once)
		const read = derivedExpense("upkeep", upkeep("home"), once)
		const { baseline, scenario, timeline } = makeFixture(setup([read, fixed]))
		expect(check(baseline, scenario, timeline).map((item) => item.code)).not.toContain("FLOW_CYCLE")
	})
})
