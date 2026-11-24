import { describe, expect, it } from "bun:test"
import { buildProjection } from "../output/build"
import { periodEndDates } from "../output/periods"
import { rowDates } from "../output/row-dates"
import { mutate } from "./mutate"
import { resolveReturns } from "./return-rows"
import type { Returns } from "./returns"
import { runEngine } from "./run"
import { createStates } from "./state"
import { expense, income } from "./test-flows"
import { makeFixture } from "./test-helpers"
import { valuation } from "./value"

/** One 31-day row, 2023-01-01 to 2023-02-01, on a fund opening at 1,000,000. */
function monthReturns(returnBps: number): Returns {
	return {
		returnsVersion: 1,
		series: [{ account: "fund", rows: [{ from: "2023-01-01", returnBps }] }],
	}
}

function setup(returnBps: number, balance = 1_000_000) {
	const fixture = makeFixture({
		accounts: [
			{ id: "fund", kind: "asset", rate: 0 },
			{ id: "cash", kind: "asset", rate: 0 },
		],
		balances: { fund: balance, cash: 5_000_000 },
		surplus: [{ account: "fund" }],
		withdraw: ["fund", "cash"],
		flows: [
			expense("rent", 2_000_000, { start: "2023-01-16" }),
			income("pay", 50_000, { start: "2023-01-20" }),
		],
		start: "2023-01-01",
		horizon: "2023-02-01",
	})
	const returns = monthReturns(returnBps)
	const states = createStates(
		fixture.baseline,
		fixture.scenario,
		fixture.timeline.start,
		resolveReturns(returns, fixture.timeline),
	)
	return { fixture, returns, state: states.get("fund")! }
}

describe("a deposit after a mid-row drain", () => {
	it("is not charged the growth the drain gave up, on the same day (+15%)", () => {
		const { state } = setup(1500)
		// 1,000,000 × (1 + 15% × 15/31) = 1,072,580.6, all of it taken on the 16th.
		mutate(state, "2023-01-16", -1_072_581n, undefined)
		expect(valuation(state, "2023-01-16")).toBe(0n)
		mutate(state, "2023-01-16", 1000n, undefined)
		// 1,000 × (1 + 15% × 16/31) = 1,077.4
		expect(valuation(state, "2023-02-01")).toBe(1077n)
	})

	it("is not charged it on a later day either (+15%)", () => {
		const { state } = setup(1500)
		mutate(state, "2023-01-16", -1_072_581n, undefined)
		mutate(state, "2023-01-20", 1000n, undefined)
		// 1,000 × (1 + 15% × 12/31) = 1,058.1
		expect(valuation(state, "2023-02-01")).toBe(1058n)
	})

	it("is not credited the loss the drain gave up (-15%)", () => {
		const { state } = setup(-1500)
		// 1,000,000 × (1 − 15% × 15/31) = 927,419.4, all of it taken on the 16th.
		mutate(state, "2023-01-16", -927_419n, undefined)
		mutate(state, "2023-01-20", 1000n, undefined)
		// 1,000 × (1 − 15% × 12/31) = 941.9
		expect(valuation(state, "2023-02-01")).toBe(942n)
	})

	it("restarts from the deposit when the value was floored to zero (-15%)", () => {
		const { state } = setup(-1500)
		// 927,419 on the 16th, 100 left: 72,681 of the row's 1,000,000 still falls.
		mutate(state, "2023-01-16", -927_319n, undefined)
		// 100 − 15% × 72,681 × 4/31 is below zero: the Account holds nothing on the 20th.
		mutate(state, "2023-01-20", 1000n, undefined)
		expect(valuation(state, "2023-02-01")).toBe(942n)
	})
})

describe("a withdrawal that leaves a remainder", () => {
	it("takes the excess out of what the row earned, so the rest earns nothing (+5%)", () => {
		const { state } = setup(500)
		// 1,000,000 × (1 + 5% × 15/31) = 1,024,193.5; 100 are left.
		mutate(state, "2023-01-16", -1_024_094n, undefined)
		expect(valuation(state, "2023-02-01")).toBe(100n)
	})

	it("keeps the part that earns when the withdrawal is smaller than it (+5%)", () => {
		const { state } = setup(500)
		// 1,024,194 − 24,194 leaves 1,000,000 holding 975,806 still to earn: 1,000,000 + 5% × 975,806 × 16/31 = 1,025,182.1.
		mutate(state, "2023-01-16", -24_194n, undefined)
		expect(valuation(state, "2023-02-01")).toBe(1_025_182n)
	})
})

describe("a drained fund in a run", () => {
	it("earns the +15% month on the income that follows the drain", () => {
		const { fixture, returns } = setup(1500)
		const { baseline, scenario, timeline } = fixture
		const dates = [...rowDates(timeline), ...periodEndDates(timeline.start, timeline.horizon)]
		const run = runEngine(baseline, scenario, timeline, dates, returns)
		if (!run.ok) throw new Error(JSON.stringify(run.problem))
		const built = buildProjection(run.run, baseline, scenario, timeline)
		if ("problem" in built) throw new Error(JSON.stringify(built.problem))
		const last = built.projection.rows.at(-1)
		// The fund is taken first, 1,072,581 on the 16th, then 50,000 × (1 + 15% × 12/31) = 52,903.2 lands on the 20th.
		expect(last?.balances.find((item) => item.account === "fund")?.amount).toBe(52_903)
	})
})
