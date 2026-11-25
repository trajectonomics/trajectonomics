import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { ruledExpense } from "../engine/test-rules"
import { RULE_PARITY_CASES } from "../golden/rule-parity-cases"
import { chanceOfSuccess } from "../index"
import { marketReturns } from "../market/paths"
import { outcomeOf, pathInputs } from "./path"
import { cashPlan, FLAT, FLAT_OR_CRASH, TEN_PERCENT } from "./spending-fixture"

const SEED = "0000000000000000"
const currentRate = {
	kind: "currentRate",
	portfolio: ["cash"],
	rateBps: 1000,
	rounding: "halfUp",
} as const

type Plan = ReturnType<typeof cashPlan>

function spendingOf(plan: Plan, model = FLAT, paths = 3) {
	const { baseline, scenario, timeline } = plan
	const result = chanceOfSuccess(baseline, scenario, timeline, { model, seed: SEED, paths })
	if (!result.ok) throw new Error("chance failed")
	return result.chance.spending!
}

const medians = (plan: Plan) => spendingOf(plan).bands.map((band) => band.spending[2]!.value)
const levels = (plan: Plan, model = FLAT, paths = 3) =>
	spendingOf(plan, model, paths).lowestYear.spending.map((point) => point.value)

describe("the lowest year counts only whole years", () => {
	it("skips the partial roll-up a rule starting part-way through a year begins in", () => {
		// 1,110,000 on 2026-10-01 (nine months of rent paid): Y = 111,000, 9,250 a month, three months in 2026.
		// 2027-10-01 holds 879,000: Y = 87,900, 7,325 a month. 2028-10-01 holds 671,100: Y = 67,110.
		// Roll-ups: 3 × 9,250 = 27,750; 9 × 9,250 + 3 × 7,325 = 105,225; 9 × 7,325 + 3 × 5,592 = 82,702.
		const plan = cashPlan("2028-12-31", currentRate, "2026-10-01")
		expect(medians(plan)).toEqual([27_750, 105_225, 82_702])
		const { lowestYear } = spendingOf(plan)
		expect(lowestYear.paths).toBe(3)
		expect(levels(plan)).toEqual([82_702, 82_702, 82_702, 82_702, 82_702])
	})

	it("skips the roll-ups after a rule `end`, which are partial or empty, not 0", () => {
		// Y = 120,000 in 2026; 960,000 on 2027-01-01 gives Y = 96,000, 8,000 a month for six months.
		const flows = [
			ruledExpense("spend", currentRate, { end: "2027-06-30" }),
			expense("rent", 10_000, { frequency: "monthly" }),
		]
		const plan = makeFixture({
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			balances: { cash: 1_200_000 },
			flows,
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			horizon: "2028-12-31",
			resolution: "month",
		})
		expect(medians(plan)).toEqual([120_000, 48_000, 0])
		expect(levels(plan)).toEqual([120_000, 120_000, 120_000, 120_000, 120_000])
	})
})

describe("a path that ran out has a lowest year of 0 and is always in the sample", () => {
	const lowestOf = (plan: Plan, model = FLAT_OR_CRASH, paths = 12) => {
		const inputs = pathInputs(plan.baseline, plan.scenario, plan.timeline)
		return [...marketReturns(model, 0n, paths, plan.timeline)].map((returns) => {
			const result = outcomeOf(inputs, returns)
			if (!result.ok) throw new Error("path failed")
			return result.outcome.lowestYear
		})
	}

	it("counts a path that ran out before the rule paid anything", () => {
		// 150,000 less 120,000 of rent leaves 30,000 on 2027-01-01 for a rule that starts then. Nine of the
		// twelve paths crash in 2026 and hold nothing: they never pay, yet each counts, as 0.
		const flows = [
			ruledExpense("spend", TEN_PERCENT, { start: "2027-01-01" }),
			expense("rent", 10_000, { frequency: "monthly", end: "2026-12-31" }),
		]
		const plan = makeFixture({
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			balances: { cash: 150_000 },
			flows,
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			horizon: "2029-12-31",
			resolution: "month",
		})
		expect(lowestOf(plan)).toEqual(Array.from({ length: 12 }, () => 0))
		const { lowestYear, bands } = spendingOf(plan, FLAT_OR_CRASH, 12)
		expect(lowestYear.paths).toBe(12)
		expect(lowestYear.spending.map((point) => point.value)).toEqual([0, 0, 0, 0, 0])
		// Roll-up 1 of the twelve: 0 × 10, 753 (a path that ran out in March), 3,000; rank 11 is 753.
		expect(bands[1]!.spending.map((point) => point.value)).toEqual([0, 0, 0, 0, 753])
	})

	it("counts a path that ran out in the horizon's clipped final roll-up, not the year before", () => {
		// Horizon 2027-06-30 clips roll-up 1 to six months. Eleven of seed 0's paths crash and run out
		// (rows 1, 1, 2, 2, 1, 8, 2, 14, 8, 11, 6), in roll-up 0 or in the clipped roll-up 1; the
		// third path's first crash is in row 23, beyond the horizon, so it pays 120,000 in roll-up 0.
		const lowest = lowestOf(cashPlan("2027-06-30"))
		expect(lowest).toEqual([0, 0, 120_000, 0, 0, 0, 0, 0, 0, 0, 0, 0])
	})
})

describe("the guardrails plan the parity corpus pins", () => {
	const guarded = RULE_PARITY_CASES.find((entry) => entry.name === "rule-guardrails-chance")!
	const { baseline, scenario, timeline } = guarded.fixture
	const result = chanceOfSuccess(baseline, scenario, timeline, guarded.chance!)
	if (!result.ok) throw new Error("chance failed")
	const { lowestYear } = result.chance.spending!

	it("reads 0 at level 10 because five of the six paths ran out", () => {
		// Each pays 400,000, 377,200, 355,700 in 2026 to 2028. The survivor's lowest whole year is 2029's
		// 335,426; the five that ran out read 0, whether in the last full roll-up or on the horizon day.
		expect(result.chance.succeeded).toBe(1)
		expect(lowestYear.paths).toBe(6)
		expect(lowestYear.spending.map((point) => point.value)).toEqual([0, 0, 0, 0, 335_426])
	})
})
