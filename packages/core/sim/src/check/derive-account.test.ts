import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import {
	contribution,
	derivedContribution,
	derivedExpense,
	expense,
	income,
} from "../engine/test-flows"
import { makeFixture, problems, type Setup } from "../engine/test-helpers"
import type { Derive, Flow, Metric, Milestone } from "../types"
import type { Problem } from "./codes"
import { check } from "./index"
import { levyProblems } from "./levy-fixture"
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

	it("refuses an Account read in a Levy's Measure through check(), at the Measure's own path", () => {
		const measures = [
			{ id: "base", op: "const", value: 100 },
			{ id: "home", op: "account", account: "home" },
		]
		expect(levyProblems([["measures"], measures], [["due"], "base"])).toContainEqual({
			code: "ACCOUNT_MEASURE_IN_LEVY",
			path: ["scenario", "levies", 0, "measures", 1],
		})
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

/** A once-a-year `later` Milestone and one `cheap` that reads the next twelve months of expenses. */
function windowPlan(metric: Metric, flows: readonly Flow[]) {
	const later: Milestone = {
		id: "later",
		combine: "all",
		criteria: [
			{ id: "when", kind: "date", on: "2028-01-01" },
			{
				id: "all",
				kind: "metric",
				metric: "allAssets",
				op: "atLeast",
				amount: 0,
				terms: "nominal",
			},
		],
	}
	const cheap: Milestone = {
		id: "cheap",
		combine: "all",
		criteria: [
			{ id: "low", kind: "metric", metric, op: "atMost", amount: 2_000_000, terms: "nominal" },
		],
	}
	const built = makeFixture(
		setup(flows, { balances: { cash: 5_000_000_000, home: 0 }, horizon: "2031-01-01" }),
	)
	return { ...built, scenario: { ...built.scenario, milestones: [later, cheap] } }
}

const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const buy = contribution("buy", "home", 600_000_000, { ...once, startAt: "later" })
const homeFlows: readonly Flow[] = [
	income("bonus", 700_000_000, { ...once, earned: false }),
	expense("living", 100_000, monthly),
	buy,
	derivedExpense("upkeep", upkeep("home"), monthly),
]
const codesOf = (fixture: ReturnType<typeof windowPlan>) =>
	check(fixture.baseline, fixture.scenario, fixture.timeline)

describe("a Milestone's next-12-months expenses beside a Derived amount that reads an Account", () => {
	const next = { expenses: "next12Months" } as const
	const at = ["scenario", "milestones", 1, "criteria", 0, "metric", "expenses"] as const

	it("is refused at the Metric's expenses key: the window would need the home's value on dates ahead", () => {
		// 'cheap' fires on 1 Jan 2026 if its window of 1,200,000 is priced before the home is bought,
		// and never if it is priced from a run that buys the home (13,200,000): the window cannot
		// know which, so check() refuses the Scenario rather than answer from the wrong run.
		const fixture = windowPlan(next, homeFlows)
		expect(codesOf(fixture)).toEqual([{ code: "NEXT_12_MONTHS_READS_ACCOUNT", path: [...at] }])
		expect(project(fixture.baseline, fixture.scenario, fixture.timeline)).toEqual({
			ok: false,
			problems: [{ code: "NEXT_12_MONTHS_READS_ACCOUNT", path: [...at] }],
		})
	})

	it("is refused for a multiple's base window as well, at the base key", () => {
		const fixture = windowPlan({ accounts: ["cash"] }, homeFlows)
		const criterion = {
			id: "low",
			kind: "multiple",
			metric: { accounts: ["cash"] },
			op: "atLeast",
			base: next,
			num: 25,
			den: 1,
			terms: "nominal",
		}
		const cheap = { id: "cheap", combine: "all", criteria: [criterion] }
		const scenario = { ...fixture.scenario, milestones: [fixture.scenario.milestones![0], cheap] }
		const found = check(fixture.baseline, scenario, fixture.timeline)
		expect(found).toEqual([
			{
				code: "NEXT_12_MONTHS_READS_ACCOUNT",
				path: ["scenario", "milestones", 1, "criteria", 0, "base", "expenses"],
			},
		])
	})

	it("accepts the same Milestone when no Derived amount reads an Account", () => {
		const fixed = homeFlows.map((flow) =>
			flow.id === "upkeep" ? expense("upkeep", 1_000, monthly) : flow,
		)
		expect(codesOf(windowPlan(next, fixed))).toEqual([])
	})

	it("accepts a trailing window, which reads only what the run itself landed", () => {
		expect(codesOf(windowPlan({ expenses: "trailing12Months" }, homeFlows))).toEqual([])
	})
})
