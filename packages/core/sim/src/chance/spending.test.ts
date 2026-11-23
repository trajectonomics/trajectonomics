import { describe, expect, it } from "bun:test"
import { chanceOfSuccess } from "../index"
import { marketReturns } from "../market/paths"
import { outcomeOf, pathInputs } from "./path"
import { cashPlan, FLAT, FLAT_OR_CRASH } from "./spending-fixture"

const SEED = "0000000000000000"

/**
 * Each month the rule pays 10,000 and the rent 10,000 from 1,200,000 in cash. A path whose first
 * crash is in month row j has paid f = j + 1 months by month f's first day, when it holds
 * (1,200,000 − 20,000 f) / 10,000 = 120 − 2f: that day plans 20,000 and meets 120 − 2f of it, so the
 * rule is paid floor((120 − 2f) × 10,000 / 20,000) = 60 − f. Seed 0's twelve paths crash first in rows
 * 1, 1, none, 2, 2, 1, 8, 2, 14, 8, 11 and 6, so f = 2, 2, none, 3, 3, 2, 9, 3, 15, 9, 12, 7.
 * Roll-up 0 is 10,000 × min(f, 12) plus the share when f < 12, roll-up 1 is the rest.
 */
const SPENT: readonly (readonly number[])[] = [
	[20_058, 0],
	[20_058, 0],
	[120_000, 120_000],
	[30_057, 0],
	[30_057, 0],
	[20_058, 0],
	[90_051, 0],
	[30_057, 0],
	[120_000, 30_045],
	[90_051, 0],
	[120_000, 48],
	[70_053, 0],
]

const ROWS = [1, 1, 23, 2, 2, 1, 8, 2, 14, 8, 11, 6]

describe("what the rule Flows pay on one Market path", () => {
	const fixture = cashPlan("2027-12-31")
	const { baseline, scenario, timeline } = fixture
	const inputs = pathInputs(baseline, scenario, timeline)
	const paths = [...marketReturns(FLAT_OR_CRASH, 0n, 12, timeline)]

	it("draws the crashes the table above is worked from", () => {
		const first = paths.map((path) => path.series[0]!.rows.findIndex((row) => row.returnBps !== 0))
		expect(first).toEqual(ROWS)
	})

	it("pays the met share of the failing day, then 0 in every later roll-up", () => {
		const spent = paths.map((path) => {
			const result = outcomeOf(inputs, path)
			if (!result.ok) throw new Error("path failed")
			return result.outcome.spent
		})
		expect(spent).toEqual(SPENT as number[][])
	})
})

describe("chanceOfSuccess spending", () => {
	const { baseline, scenario, timeline } = cashPlan("2027-12-31")
	const result = chanceOfSuccess(baseline, scenario, timeline, {
		model: FLAT_OR_CRASH,
		seed: SEED,
		paths: 12,
	})
	if (!result.ok) throw new Error("chance failed")
	const { spending } = result.chance

	it("reports the nearest-rank Percentiles of each roll-up across all twelve paths", () => {
		// Roll-up 0 ascending: 20,058 × 3, 30,057 × 3, 70,053, 90,051 × 2, 120,000 × 3. Ranks of 12:
		// ceil(1.2) = 2, ceil(3) = 3, 6, 9, ceil(10.8) = 11. Roll-up 1: 0 × 9, 48, 30,045, 120,000.
		const LEVELS = [10, 25, 50, 75, 90]
		const levels = (values: number[]) =>
			values.map((value, index) => ({ level: LEVELS[index]!, value }))
		expect(spending!.bands).toEqual([
			{ index: 0, to: "2026-12-31", spending: levels([20_058, 20_058, 30_057, 90_051, 120_000]) },
			{ index: 1, to: "2027-12-31", spending: levels([0, 0, 0, 0, 30_045]) },
		])
	})

	it("takes each path's lowest roll-up, which is 0 for every path that ran out before the last", () => {
		// Lowest per path: 0 × 9, 48 (path 10), 30,045 (path 8), 120,000 (path 2).
		expect(spending!.lowestYear.paths).toBe(12)
		expect(spending!.lowestYear.spending.map((point) => point.value)).toEqual([0, 0, 0, 0, 30_045])
	})

	it("still counts the one survivor in the chance of success, floored to 833 basis points", () => {
		expect(result.chance.succeeded).toBe(1)
		expect(result.chance.successBps).toBe(833)
	})
})

describe("the lowest year starts at the first roll-up the rule paid in", () => {
	const ruleFrom2027 = {
		kind: "currentRate",
		portfolio: ["cash"],
		rateBps: 1000,
		rounding: "halfUp",
	} as const
	const run = (horizon: string) => {
		const { baseline, scenario, timeline } = cashPlan(horizon, ruleFrom2027, "2027-01-01")
		const options = { model: FLAT, seed: SEED, paths: 3 }
		const result = chanceOfSuccess(baseline, scenario, timeline, options)
		if (!result.ok) throw new Error("chance failed")
		return result.chance.spending!
	}

	it("skips a roll-up before the rule started, so 0 there is not the lowest year", () => {
		// Cash is 1,200,000 − 120,000 of rent = 1,080,000 on 2027-01-01: Y = 108,000. On 2028-01-01 it is
		// 1,080,000 − 120,000 − 108,000 = 852,000: Y = 85,200. Roll-ups: 0, 108,000, 85,200.
		const spending = run("2028-12-31")
		expect(spending.bands.map((band) => band.spending[2]!.value)).toEqual([0, 108_000, 85_200])
		expect(spending.lowestYear).toMatchObject({ paths: 3 })
		expect(spending.lowestYear.spending.every((point) => point.value === 85_200)).toBe(true)
	})

	it("stops at the last full roll-up, leaving out a clipped final one", () => {
		// The horizon 2028-06-30 clips roll-up 2 to six months of 7,100: 42,600, still a Band, not a year.
		const spending = run("2028-06-30")
		expect(spending.bands.map((band) => band.spending[2]!.value)).toEqual([0, 108_000, 42_600])
		expect(spending.lowestYear.spending.every((point) => point.value === 108_000)).toBe(true)
	})

	it("has no lowest year when the rule pays only in a clipped roll-up", () => {
		const spending = run("2027-06-30")
		expect(spending.lowestYear).toEqual({ paths: 0, spending: [] })
	})
})

describe("a plan without a rule Flow", () => {
	it("returns no spending key at all", () => {
		const { baseline, scenario, timeline } = cashPlan("2026-12-31")
		const plain = { ...scenario, flows: scenario.flows.filter((flow) => flow.id === "rent") }
		const result = chanceOfSuccess(baseline, plain, timeline, { model: FLAT, seed: SEED, paths: 2 })
		if (!result.ok) throw new Error("chance failed")
		expect("spending" in result.chance).toBe(false)
	})
})
