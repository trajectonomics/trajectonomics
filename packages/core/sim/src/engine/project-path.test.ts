import { describe, expect, it } from "bun:test"
import { drawdown, twoBuckets } from "../chance/path-fixture"
import { chanceOfSuccess, projectPath } from "../index"
import type { PathSelection } from "../types"

const SEED = "0000000000000000"
const { baseline, scenario, timeline } = drawdown

function pathOf(index: number, extra: Partial<PathSelection> = {}) {
	return projectPath(baseline, scenario, timeline, {
		model: twoBuckets,
		seed: SEED,
		paths: 200,
		index,
		...extra,
	})
}

function codes(selection: unknown): readonly string[] {
	const result = projectPath(baseline, scenario, timeline, selection as PathSelection)
	if (result.ok) throw new Error("expected a refusal")
	return result.problems.map((problem) => problem.code)
}

describe("projectPath", () => {
	const chance = chanceOfSuccess(baseline, scenario, timeline, {
		model: twoBuckets,
		seed: SEED,
		paths: 200,
		outcomes: true,
	})
	if (!chance.ok) throw new Error("chance failed")
	const { outcomes } = chance.chance

	it("replays every path of a 200-path run: closing net worth, lowest and runs-out", () => {
		for (const outcome of outcomes!) {
			const result = pathOf(outcome.index)
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const { annual, runsOut } = result.projection
			const closings = annual.map((rollup) => rollup.closingNetWorth)
			expect(annual[annual.length - 1]!.closingNetWorth).toBe(outcome.closingNetWorth)
			expect(Math.min(...closings)).toBe(outcome.lowestNetWorth)
			expect(closings.indexOf(outcome.lowestNetWorth)).toBe(outcome.lowestAt)
			expect(runsOut).toEqual(outcome.runsOut)
		}
		expect(outcomes!.some((outcome) => outcome.runsOut !== undefined)).toBe(true)
		expect(outcomes!.some((outcome) => outcome.runsOut === undefined)).toBe(true)
	})

	it("is the same Projection twice, and takes the options project() takes", () => {
		const result = pathOf(3)
		expect(result).toEqual(pathOf(3))
		const withBreakdown = projectPath(
			baseline,
			scenario,
			timeline,
			{ model: twoBuckets, seed: SEED, paths: 200, index: 3 },
			{ cashflowBreakdown: true },
		)
		if (!result.ok || !withBreakdown.ok) throw new Error("refused")
		expect(result.projection.cashflow).toBeUndefined()
		expect(withBreakdown.projection.cashflow?.length).toBe(result.projection.annual.length)
	})

	it("draws different paths for different indexes under one seed", () => {
		const closings = [0, 1, 2, 3, 4, 5].map((index) => {
			const result = pathOf(index)
			return result.ok ? JSON.stringify(result.projection.returns) : undefined
		})
		expect(new Set(closings).size).toBeGreaterThan(1)
	})

	it("reports one entry per roll-up and one return per Account of the model", () => {
		const result = pathOf(0)
		if (!result.ok) throw new Error("refused")
		const { returns, annual } = result.projection
		expect(returns.map((entry) => entry.index)).toEqual(annual.map((rollup) => rollup.index))
		for (const entry of returns) {
			expect(entry.accounts.map((item) => item.account)).toEqual(["fund", "bond"])
		}
	})
})

describe("projectPath refusals", () => {
	const base = { model: twoBuckets, seed: SEED, paths: 200 }

	it("refuses a negative index as INVALID_PATH_INDEX", () => {
		expect(codes({ ...base, index: -1 })).toEqual(["INVALID_PATH_INDEX"])
	})

	it("refuses an index at the path count and accepts the one before it", () => {
		expect(codes({ ...base, index: 200 })).toEqual(["INVALID_PATH_INDEX"])
		expect(pathOf(199).ok).toBe(true)
	})

	it("reports a bad selection under `selection`, not `options`", () => {
		const result = pathOf(200)
		if (result.ok) throw new Error("expected a refusal")
		expect(result.problems).toEqual([{ code: "INVALID_PATH_INDEX", path: ["selection", "index"] }])
		const bad = projectPath(baseline, scenario, timeline, undefined as unknown as PathSelection)
		if (bad.ok) throw new Error("expected a refusal")
		expect(bad.problems).toEqual([{ code: "NOT_AN_OBJECT", path: ["selection"] }])
	})

	it("accepts the last index the cap of 10,000 paths allows", () => {
		expect(pathOf(9999, { paths: 10000 }).ok).toBe(true)
	})

	it("checks the path count as chance of success does", () => {
		expect(codes({ ...base, paths: 0, index: 0 })).toEqual(["INVALID_PATH_COUNT"])
		expect(codes({ ...base, paths: 10001, index: 0 })).toEqual(["INVALID_PATH_COUNT"])
	})

	it("refuses a fractional index, a bad seed, a missing key and a stray key", () => {
		expect(codes({ ...base, index: 1.5 })).toEqual(["NOT_SAFE_INTEGER"])
		expect(codes({ ...base, seed: "ABC", index: 0 })).toEqual(["INVALID_SEED"])
		expect(codes({ model: twoBuckets, seed: SEED, paths: 200 })).toEqual(["MISSING_KEY"])
		expect(codes({ ...base, index: 0, outcomes: true })).toEqual(["UNKNOWN_KEY"])
		expect(codes(undefined)).toEqual(["NOT_AN_OBJECT"])
	})

	it("refuses a Return model that names an Account the Scenario lacks", () => {
		const model = { ...twoBuckets, accounts: ["fund", "ghost"] }
		expect(codes({ ...base, model, index: 0 })).toContain("UNKNOWN_ACCOUNT")
	})
})
