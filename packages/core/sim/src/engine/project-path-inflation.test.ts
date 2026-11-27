import { describe, expect, it } from "bun:test"
import { chanceOfSuccess, planReturnModel } from "../index"
import type { Baseline, ReturnModel, Scenario, Timeline } from "../types"
import { project } from "./project"
import { projectPath } from "./project-path"
import { makeFixture } from "./test-helpers"

const FULL = 4_294_967_296
const SEED = "0123456789abcdef"

const fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 700, volatility: 1500 }],
	balances: { cash: 100_000_000 },
	flows: [
		{
			id: "living",
			kind: "expense",
			amount: 400_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: "inflation",
		},
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	inflation: 300,
	horizon: "2029-01-01",
	resolution: "month",
})

const built = planReturnModel(
	{ ...fixture.scenario, economy: { inflation: 300, inflationVolatility: 200 } },
	{ buckets: 16 },
)
if (!built.ok) throw new Error("the plan model was refused")
const model: ReturnModel = built.model

interface Inputs {
	readonly baseline: Baseline
	readonly scenario: Scenario
	readonly timeline: Timeline
}
const { baseline, scenario, timeline }: Inputs = fixture

function selection(index: number, paths: number) {
	return { model, seed: SEED, paths, index }
}

function path(index: number, paths: number) {
	const result = projectPath(baseline, scenario, timeline, selection(index, paths))
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

describe("projectPath on a plan that draws inflation", () => {
	it("closes every path at the net worth the chance reports for it", () => {
		const chance = chanceOfSuccess(baseline, scenario, timeline, {
			model,
			seed: SEED,
			paths: 50,
			outcomes: true,
		})
		if (!chance.ok) throw new Error(JSON.stringify(chance.problems))
		const outcomes = chance.chance.outcomes!
		expect(outcomes).toHaveLength(50)
		for (let index = 0; index < 50; index++) {
			const annual = path(index, 50).annual
			expect(annual[annual.length - 1]!.closingNetWorth).toBe(outcomes[index]!.closingNetWorth)
		}
	})

	it("reports the real net worth of a one-path run as its real Bands", () => {
		const day: Inputs = { ...fixture, timeline: { ...timeline, resolution: "day" } }
		const chance = chanceOfSuccess(day.baseline, day.scenario, day.timeline, {
			model,
			seed: SEED,
			paths: 1,
		})
		if (!chance.ok) throw new Error(JSON.stringify(chance.problems))
		const result = projectPath(day.baseline, day.scenario, day.timeline, selection(0, 1))
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const rows = new Map(result.projection.rows.map((row) => [row.date, row.realNetWorth]))
		for (const band of chance.chance.realBands!) {
			expect(rows.get(band.to)).toBe(band.netWorth[2]!.value)
		}
		expect(rows.size).toBeGreaterThan(1)
	})

	it("states 300 bps over a whole year of a flat 300-bps path", () => {
		const flat: ReturnModel = {
			id: "flat",
			accounts: ["cash"],
			buckets: [{ returnsBps: [0], weight: FULL }],
			inflation: { buckets: [{ rateBps: 300, weight: FULL }] },
		}
		const result = projectPath(baseline, scenario, timeline, {
			model: flat,
			seed: SEED,
			paths: 1,
			index: 0,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.projection.returns?.[0]?.inflationBps).toBe(300)
	})

	it("writes no inflation or real Bands into the deterministic Projection", () => {
		const plain = project(baseline, scenario, timeline)
		if (!plain.ok) throw new Error(JSON.stringify(plain.problems))
		expect(JSON.stringify(plain.projection)).not.toContain("inflationBps")
	})
})
