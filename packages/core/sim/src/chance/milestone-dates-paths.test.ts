import { describe, expect, it } from "bun:test"
import { income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { ChanceMilestone, ChanceOfSuccess, Milestone, ReturnModel } from "../types"
import { chanceOfSuccess } from "./chance-of-success"

const QUARTER = 1073741824
const SEED = "0000000000000000"
const LEVELS = [10, 25, 50, 75, 90] as const

/** Four monthly growth buckets, 0 to 7.5%, each a quarter of the draw: paths cross the line in different months. */
const steps: ReturnModel = {
	id: "steps",
	accounts: ["cash"],
	buckets: [
		{ returnsBps: [0], weight: QUARTER },
		{ returnsBps: [250], weight: QUARTER },
		{ returnsBps: [500], weight: QUARTER },
		{ returnsBps: [750], weight: QUARTER },
	],
}

/** Cash of 1,000 and 1,000 of salary on each 1st, so net worth crosses 41,500 around early 2028. */
const plan = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 1000 },
	flows: [income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2028-12-31",
	resolution: "month",
})

/** Fires when net worth is at least 41,500, read before the 1st's salary lands. */
const rich: Milestone = {
	id: "rich",
	combine: "all",
	criteria: [
		{
			id: "c",
			kind: "metric",
			metric: "netWorth",
			op: "atLeast",
			amount: 41_500,
			terms: "nominal",
		},
	],
}

/** Ten paths under seed 0: the Fire date of each, in path order, recorded from the run. */
const FIRED = [
	"2028-02-01",
	"2027-12-01",
	"2028-04-01",
	"2028-03-01",
	"2028-01-01",
	"2028-01-01",
	"2028-02-01",
	"2027-11-01",
	"2028-01-01",
	"2028-03-01",
]

function chance(paths: number): ChanceOfSuccess {
	const scenario = { ...plan.scenario, milestones: [rich] }
	const result = chanceOfSuccess(plan.baseline, scenario, plan.timeline, {
		model: steps,
		seed: SEED,
		paths,
		outcomes: true,
		milestoneDates: true,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance
}

/** The calendar month a Fire date falls in, as its first day. */
function monthStart(date: string): string {
	return `${date.slice(0, 7)}-01`
}

/**
 * The nearest-rank recount over months, written here rather than read from `milestoneSummary`:
 * level L of N picks element ceil(L × N / 100), 1-based, of the sorted fire months.
 */
function recount(fired: readonly string[]): ChanceMilestone {
	const months = fired.map(monthStart).sort()
	const at = (level: number): string => months[Math.ceil((level * months.length) / 100) - 1]!
	const years = [...new Set(months.map((date) => Number(date.slice(0, 4))))].sort((a, b) => a - b)
	return {
		id: "rich",
		reached: fired.length,
		dates: LEVELS.map((level) => ({ level, date: at(level) })),
		byYear: years.map((year) => ({
			year,
			paths: months.filter((date) => date.startsWith(`${year}-`)).length,
		})),
	}
}

describe("milestone fire dates over an even number of Market paths", () => {
	it("fires ten paths on six months across two years", () => {
		const outcomes = chance(10).outcomes!
		expect(outcomes.map((outcome) => outcome.milestones?.["rich"])).toEqual(FIRED)
	})

	it("matches an independent nearest-rank recount of those months", () => {
		const expected = recount(FIRED)
		// The recount itself, hand-checked: ranks 1, 3, 5, 8 and 9 of the ten sorted months. A floor
		// rank (1, 2, 5, 7, 9) would give 2027-12 at 25 and 2028-02 at 75, so this pins the ceiling.
		expect(expected).toEqual({
			id: "rich",
			reached: 10,
			dates: [
				{ level: 10, date: "2027-11-01" },
				{ level: 25, date: "2028-01-01" },
				{ level: 50, date: "2028-01-01" },
				{ level: 75, date: "2028-03-01" },
				{ level: 90, date: "2028-03-01" },
			],
			byYear: [
				{ year: 2027, paths: 2 },
				{ year: 2028, paths: 8 },
			],
		})
		expect(chance(10).milestones).toEqual([expected])
	})
})
