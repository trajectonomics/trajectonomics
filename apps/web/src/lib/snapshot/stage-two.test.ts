import { describe, expect, test } from "bun:test"
import { failedRead, stageOne } from "./fixtures.test-support"
import { checkParams, type PlanInput, type PlanParams } from "./params"
import { planStageTwo } from "./stage-two"

const input: PlanInput = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: [],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	returnModel: null,
	paths: null,
	seed: null,
}

function paramsOf(overrides: Partial<PlanInput>): PlanParams {
	const result = checkParams({ ...input, ...overrides })
	if (!result.ok) throw new Error(`fixture parameters must hold: ${result.error.code}`)
	return result.params
}

describe("stage two", () => {
	test("the as-of reads take the As-of, and the period reads take the calendar's first days", () => {
		const plan = planStageTwo(paramsOf({}), stageOne("2026-10-31", ["base"]))
		expect(plan.doctor.argv).toEqual(["doctor", "--as-of", "2026-10-31", "--json"])
		expect(plan.balance.argv).toEqual([
			"balance",
			"--as-of",
			"2026-10-31",
			"--trial-balance",
			"--json",
		])
		expect(plan.baseline.argv).toEqual(["baseline", "show", "--as-of", "2026-10-31", "--json"])
		expect(plan.pnl.argv).toEqual([
			"report",
			"pnl",
			"--since",
			"2026-01-01",
			"--until",
			"2026-10-31",
			"--json",
		])
		expect(plan.transactions.argv).toEqual([
			"tx",
			"list",
			"--since",
			"2026-08-01",
			"--until",
			"2026-10-31",
			"--json",
		])
	})

	test("the net worth history is one read per month-end since the first transaction, at most 36", () => {
		const plan = planStageTwo(paramsOf({}), stageOne("2026-10-31", ["base"], "2024-11-01"))
		expect(plan.historyDates).toHaveLength(24)
		expect(plan.historyDates[0]).toBe("2024-11-30")
		expect(plan.historyDates.at(-1)).toBe("2026-10-31")
		expect(plan.netWorthHistory.map((read) => read.argv.at(3))).toEqual(plan.historyDates)
	})

	test("a ledger with no transaction has no history", () => {
		const plan = planStageTwo(paramsOf({}), stageOne("2026-10-31", ["base"], null))
		expect(plan.historyDates).toEqual([])
		expect(plan.netWorthHistory).toEqual([])
	})

	test("with no Scenario named, it projects and runs fi for every Scenario in the ledger", () => {
		const plan = planStageTwo(paramsOf({}), stageOne("2026-10-31", ["base", "retire-early"]))
		expect(plan.scenarios).toEqual(["base", "retire-early"])
		expect(Object.keys(plan.projections)).toEqual(["base", "retire-early"])
		expect(plan.projections["retire-early"]?.argv).toEqual([
			"projection",
			"run",
			"--scenario=retire-early",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--breakdown",
			"--liabilities",
			"--accounts",
			"--json",
		])
		expect(plan.fi["base"]?.argv).toEqual([
			"fi",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--json",
		])
	})

	test("each Scenario's document is read in the decimal form, with the name after the flags", () => {
		const plan = planStageTwo(paramsOf({}), stageOne("2026-10-31", ["base", "retire-early"]))
		expect(Object.keys(plan.documents)).toEqual(["base", "retire-early"])
		expect(plan.documents["base"]?.argv).toEqual([
			"scenario",
			"show",
			"--decimal",
			"--json",
			"--",
			"base",
		])
		expect(plan.documents["base"]?.carryInFor).toEqual([])
	})

	test("a named Scenario replaces the ledger's list", () => {
		const plan = planStageTwo(
			paramsOf({ scenarios: ["retire-early"] }),
			stageOne("2026-10-31", ["base", "retire-early"]),
		)
		expect(Object.keys(plan.projections)).toEqual(["retire-early"])
	})

	test("a failed scenario list projects nothing rather than guessing names", () => {
		const one = stageOne("2026-10-31", ["base"])
		const plan = planStageTwo(paramsOf({}), {
			...one,
			scenarios: failedRead(["scenario", "list", "--json"]),
		})
		expect(plan.scenarios).toEqual([])
		expect(plan.projections).toEqual({})
		expect(plan.fi).toEqual({})
	})

	test("the monthly rows are asked of projections only, and Carry-in is named per read", () => {
		const plan = planStageTwo(
			paramsOf({ monthly: true, carryIn: true }),
			stageOne("2026-10-31", ["base"]),
		)
		expect(plan.projections["base"]?.argv).toContain("--monthly")
		expect(plan.projections["base"]?.argv.slice(-7)).toEqual([
			"--carry-in",
			"-",
			"--monthly",
			"--breakdown",
			"--liabilities",
			"--accounts",
			"--json",
		])
		expect(plan.projections["base"]?.carryInFor).toEqual(["base"])
		expect(plan.fi["base"]?.argv).not.toContain("--monthly")
		expect(plan.fi["base"]?.carryInFor).toEqual(["base"])
		expect(plan.doctor.carryInFor).toEqual([])
	})

	test("a compare takes two names, the birth date and each age, and the Carry-in of both sides", () => {
		const plan = planStageTwo(
			paramsOf({
				compare: { a: "base", b: "retire-early" },
				birthDate: "1990-05-15",
				ages: [45, 60],
				carryIn: true,
				returnModel: null,
				paths: null,
				seed: null,
			}),
			stageOne("2026-10-31", ["base", "retire-early"]),
		)
		expect(plan.compare?.argv).toEqual([
			"projection",
			"compare",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--birth-date",
			"1990-05-15",
			"--age",
			"45",
			"--age",
			"60",
			"--carry-in",
			"-",
			"--json",
			"--",
			"base",
			"retire-early",
		])
		expect(plan.compare?.carryInFor).toEqual(["base", "retire-early"])
	})

	test("without a compare asked for, there is no compare read", () => {
		expect(planStageTwo(paramsOf({}), stageOne("2026-10-31", ["base"])).compare).toBeNull()
	})
})
