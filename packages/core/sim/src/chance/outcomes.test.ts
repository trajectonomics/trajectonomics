import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { chanceOfSuccess } from "../index"
import type { ChanceOfSuccess, ChanceOfSuccessOptions, Flow, ReturnModel } from "../types"
import { drawdown, twoBuckets } from "./path-fixture"

const options: ChanceOfSuccessOptions = { model: twoBuckets, seed: "0000000000000000", paths: 200 }

function run(extra: Partial<ChanceOfSuccessOptions> = {}, fixture = drawdown): ChanceOfSuccess {
	const { baseline, scenario, timeline } = fixture
	const result = chanceOfSuccess(baseline, scenario, timeline, { ...options, ...extra })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance
}

describe("chance of success outcomes", () => {
	it("is byte for byte the old result without the option", () => {
		const { outcomes: _, ...rest } = run({ outcomes: true })
		expect(JSON.stringify(run())).toBe(JSON.stringify(rest))
		expect(JSON.stringify(run({ outcomes: false }))).toBe(JSON.stringify(run()))
		expect("outcomes" in run()).toBe(false)
	})

	it("reports one outcome per Market path in index order", () => {
		const { outcomes, paths } = run({ outcomes: true })
		expect(outcomes?.map((outcome) => outcome.index)).toEqual(
			Array.from({ length: paths }, (_, i) => i),
		)
	})

	it("agrees with the Bands and the Runs-out counts it was read with", () => {
		const { outcomes, bands, runsOut, succeeded } = run({ outcomes: true })
		const closing = outcomes!.map((outcome) => outcome.closingNetWorth).sort((a, b) => a - b)
		const horizon = bands[bands.length - 1]!
		// Nearest rank over 200 paths: level L is element ceil(L × 200 / 100) − 1 = 2L − 1.
		expect(horizon.netWorth.map((point) => point.value)).toEqual(
			[10, 25, 50, 75, 90].map((level) => closing[2 * level - 1]!),
		)
		const failed = outcomes!.filter((outcome) => outcome.runsOut !== undefined)
		expect(outcomes!.length - failed.length).toBe(succeeded)
		expect(failed.length).toBe(runsOut.reduce((sum, entry) => sum + entry.paths, 0))
		expect(succeeded).toBeGreaterThan(0)
		expect(failed.length).toBeGreaterThan(0)
	})
})

describe("the lowest roll-up of a path", () => {
	const flat: ReturnModel = {
		id: "flat",
		accounts: ["cash"],
		buckets: [{ returnsBps: [0], weight: 4294967296 }],
	}
	const account = { id: "cash", kind: "asset", rate: 0 } as const
	const outcomeOf = (flows: readonly Flow[]) => {
		const fixture = makeFixture({
			accounts: [account],
			balances: { cash: 100_000 },
			flows,
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			horizon: "2029-01-01",
			resolution: "month",
		})
		return run({ model: flat, paths: 1, outcomes: true }, fixture).outcomes![0]!
	}

	it("is the last roll-up of a falling plan: 100,000 less 12,000 a year for three years", () => {
		const monthly = expense("rent", 1_000, { start: "2026-01-31", frequency: "monthly" })
		expect(outcomeOf([monthly])).toEqual({
			index: 0,
			closingNetWorth: 64_000,
			lowestNetWorth: 64_000,
			lowestAt: 2,
		})
	})

	it("is the first roll-up of a plan that never changes, a tie going to the earliest", () => {
		expect(outcomeOf([])).toEqual({
			index: 0,
			closingNetWorth: 100_000,
			lowestNetWorth: 100_000,
			lowestAt: 0,
		})
	})

	it("is the roll-up before a recovery, not the last", () => {
		const bill = expense("bill", 30_000, { start: "2026-06-01" })
		const refund = income("refund", 20_000, { start: "2027-06-01", earned: false })
		expect(outcomeOf([bill, refund]).lowestAt).toBe(0)
		expect(outcomeOf([bill, refund])).toMatchObject({
			closingNetWorth: 90_000,
			lowestNetWorth: 70_000,
		})
	})
})
