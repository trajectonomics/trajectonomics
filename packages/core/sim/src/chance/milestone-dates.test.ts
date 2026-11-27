import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { ChanceOfSuccess, Milestone, ReturnModel, Scenario } from "../types"
import { chanceOfSuccess } from "./chance-of-success"
import { milestoneSummary } from "./milestone-dates"

const FULL = 4294967296
const HALF = 2147483648
const SEED = "0000000000000000"

/** Every path is the same: cash 1,000 opens, and 1,000 of salary lands on each 1st. */
const flat: ReturnModel = {
	id: "flat",
	accounts: ["cash"],
	buckets: [{ returnsBps: [0], weight: FULL }],
}

/** Seed 0 draws the flat bucket on path 0 and the -99.99% one on path 1. */
const twoWay: ReturnModel = {
	id: "two-way",
	accounts: ["cash"],
	buckets: [
		{ returnsBps: [0], weight: HALF },
		{ returnsBps: [-9999], weight: HALF },
	],
}

const fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 1000 },
	flows: [income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-31",
	resolution: "month",
})

/** Cash of 1,000 and a 950 bill on 1 Feb: a flat January pays it, a crashed one cannot. */
const bills = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 1000 },
	flows: [expense("bill", 950, { start: "2026-02-01" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-31",
	resolution: "month",
})

function atLeast(id: string, amount: number): Milestone {
	return {
		id,
		combine: "all",
		criteria: [
			{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount, terms: "nominal" },
		],
	}
}

function withMilestones(
	model: ReturnModel,
	milestones: readonly Milestone[],
	paths: number,
	outcomes = false,
	plan = fixture,
): ChanceOfSuccess {
	const scenario: Scenario = { ...plan.scenario, milestones }
	const result = chanceOfSuccess(plan.baseline, scenario, plan.timeline, {
		model,
		seed: SEED,
		paths,
		...(outcomes ? { outcomes } : {}),
		milestoneDates: true,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance
}

/** A Milestone that fires on a date, so only the paths alive on it reach it. */
function onDate(id: string, on: string): Milestone {
	return { id, combine: "all", criteria: [{ id: "c", kind: "date", on }] }
}

/** The five Levels of a single fired month, as every path agrees. */
function everyLevel(date: string) {
	return [10, 25, 50, 75, 90].map((level) => ({ level, date }))
}

describe("milestone dates over a flat market", () => {
	it("fires every path on the one deterministic date", () => {
		const chance = withMilestones(flat, [atLeast("rich", 3000)], 3)
		expect(chance.milestones).toEqual([
			{
				id: "rich",
				reached: 3,
				dates: everyLevel("2026-03-01"),
				byYear: [{ year: 2026, paths: 3 }],
			},
		])
	})

	it("fires a chained Milestone two months after the one it names", () => {
		const later: Milestone = {
			id: "later",
			combine: "all",
			criteria: [{ id: "c", kind: "milestone", milestone: "rich", months: 2 }],
		}
		const chance = withMilestones(flat, [atLeast("rich", 3000), later], 2)
		expect(chance.milestones?.map((item) => [item.id, item.dates[0]?.date])).toEqual([
			["rich", "2026-03-01"],
			["later", "2026-05-01"],
		])
	})

	it("reports reached 0 and no dates for a Milestone that never fires", () => {
		const chance = withMilestones(flat, [atLeast("never", 1_000_000)], 2)
		expect(chance.milestones).toEqual([{ id: "never", reached: 0, dates: [], byYear: [] }])
	})
})

describe("milestone dates over two buckets", () => {
	// Seed 0's January draw is flat on path 0 and -99.99% on path 1. After one month of growth the
	// flat path opens 1 Feb with 1,000 and the crashed one cannot, so path 0 pays the 950 bill and
	// path 1 runs out on it. The Milestone fires on 1 Mar, and only path 0 is alive to reach it.
	it("counts only the path that fired, hand-checked from the monthly balance", () => {
		const chance = withMilestones(twoWay, [onDate("stop", "2026-03-01")], 2, false, bills)
		expect(chance.milestones).toEqual([
			{
				id: "stop",
				reached: 1,
				dates: everyLevel("2026-03-01"),
				byYear: [{ year: 2026, paths: 1 }],
			},
		])
	})

	it("gives each Path outcome the fire dates of the Milestones it fired", () => {
		const chance = withMilestones(twoWay, [onDate("stop", "2026-03-01")], 2, true, bills)
		expect(chance.outcomes?.map((outcome) => outcome.milestones)).toEqual([
			{ stop: "2026-03-01" },
			{},
		])
	})
})

describe("the fire-date Percentiles", () => {
	it("uses nearest rank over months, hand-checked on three years", () => {
		// Sorted months: 2026-03, 2027-01, 2028-07. Ranks ceil(0.3)=1, ceil(0.75)=1,
		// ceil(1.5)=2, ceil(2.25)=3, ceil(2.7)=3, each reported as its month's first day.
		expect(milestoneSummary("m", ["2026-03-15", "2027-01-31", "2028-07-09"])).toEqual({
			id: "m",
			reached: 3,
			dates: [
				{ level: 10, date: "2026-03-01" },
				{ level: 25, date: "2026-03-01" },
				{ level: 50, date: "2027-01-01" },
				{ level: 75, date: "2028-07-01" },
				{ level: 90, date: "2028-07-01" },
			],
			byYear: [
				{ year: 2026, paths: 1 },
				{ year: 2027, paths: 1 },
				{ year: 2028, paths: 1 },
			],
		})
	})
})

describe("without the milestoneDates option", () => {
	const BEFORE =
		'{"ok":true,"chance":{"definition":{"modelId":"flat","seed":"0000000000000000","paths":2},"paths":2,"succeeded":2,"successBps":10000,"bands":[{"index":0,"to":"2026-12-31","netWorth":[{"level":10,"value":13000},{"level":25,"value":13000},{"level":50,"value":13000},{"level":75,"value":13000},{"level":90,"value":13000}]}],"runsOut":[{"index":0,"to":"2026-12-31","paths":0}],"outcomes":[{"index":0,"closingNetWorth":13000,"lowestNetWorth":13000,"lowestAt":0},{"index":1,"closingNetWorth":13000,"lowestNetWorth":13000,"lowestAt":0}]}}'

	it("is byte for byte the old result, recorded before the option existed", () => {
		const result = chanceOfSuccess(
			fixture.baseline,
			{ ...fixture.scenario, milestones: [atLeast("rich", 3000)] },
			fixture.timeline,
			{ model: flat, seed: SEED, paths: 2, outcomes: true },
		)
		expect(JSON.stringify(result)).toBe(BEFORE)
	})
})
