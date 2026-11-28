import { describe, expect, it } from "bun:test"
import { projectPath } from "../engine/project-path"
import type { ChanceOfSuccess, DateString, Milestone, MilestoneCombine } from "../types"
import { chanceOfSuccess } from "./chance-of-success"
import { drawdown, twoBuckets } from "./path-fixture"

const SEED = "0000000000000000"
const PATHS = [10, 7, 1] as const

/** Fires on a date, so a gate can wait on it before its Metric is read. */
const base: Milestone = {
	id: "base",
	combine: "all",
	criteria: [{ id: "d", kind: "date", on: "2026-06-01" }],
}

/** A Milestone criterion (`base` plus one month) and a net-worth Metric, combined by `combine`. */
function gateOf(combine: MilestoneCombine, amount: number): Milestone {
	return {
		id: "gate",
		combine,
		criteria: [
			{ id: "m", kind: "milestone", milestone: "base", months: 1 },
			{
				id: "n",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount,
				terms: "nominal",
			},
		],
	}
}

function scenarioOf(milestone: Milestone) {
	return { ...drawdown.scenario, milestones: [base, milestone] }
}

function chance(milestone: Milestone, paths: number): ChanceOfSuccess {
	const result = chanceOfSuccess(drawdown.baseline, scenarioOf(milestone), drawdown.timeline, {
		model: twoBuckets,
		seed: SEED,
		paths,
		outcomes: true,
		milestoneDates: true,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance
}

/** The Fire dates `projectPath` reports for the Milestones that reached on one path, by id. */
function firesOnPath(
	milestone: Milestone,
	paths: number,
	index: number,
): Record<string, DateString> {
	const result = projectPath(drawdown.baseline, scenarioOf(milestone), drawdown.timeline, {
		model: twoBuckets,
		seed: SEED,
		paths,
		index,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const fired: Record<string, DateString> = {}
	for (const item of result.projection.milestones ?? []) {
		if (item.reached) fired[item.id] = item.date
	}
	return fired
}

/** Every path of 10, 7 and 1 paths reports the same Fire dates through both entry points. */
function agrees(milestone: Milestone): void {
	for (const paths of PATHS) {
		const outcomes = chance(milestone, paths).outcomes!
		for (let index = 0; index < paths; index++) {
			expect(outcomes[index]!.milestones ?? {}).toEqual(firesOnPath(milestone, paths, index))
		}
	}
}

describe("an any gate mixing a Milestone with a Metric", () => {
	it("agrees with projectPath on every path of 10, 7 and 1", () => {
		agrees(gateOf("any", 4600))
	})

	it("fires on the Metric on some paths and on the Milestone on others", () => {
		// Seed 0, 10 paths: 5 cross 4,600 in January, 2 in April, and 3 only once base + 1 month holds.
		const fired = chance(gateOf("any", 4600), 10).outcomes!.map(
			(outcome) => outcome.milestones?.["gate"],
		)
		const [jan, apr, jul] = ["2026-01-31", "2026-04-30", "2026-07-31"]
		expect(fired).toEqual([jan, jul, jan, jan, jan, jul, apr, jul, apr, jan])
	})
})

describe("an all gate mixing a Milestone with a Metric", () => {
	it("agrees with projectPath on every path of 10, 7 and 1", () => {
		agrees(gateOf("all", 3000))
	})

	it("fires only on the paths whose Metric holds once the Milestone criterion does", () => {
		// Seed 0, 10 paths: the Metric holds at 1 July for 7 paths, so 3 never fire.
		const fired = chance(gateOf("all", 3000), 10).outcomes!.map(
			(outcome) => outcome.milestones?.["gate"],
		)
		const jul = "2026-07-31"
		expect(fired).toEqual([jul, undefined, jul, jul, jul, undefined, jul, undefined, jul, jul])
	})
})
