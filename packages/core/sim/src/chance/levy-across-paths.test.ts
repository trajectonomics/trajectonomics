import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import { levySalaryDay } from "../golden/levy-cases"
import { chanceOfSuccess, projectPath } from "../index"
import type { ReturnModel } from "../types"

const FULL = 4_294_967_296
const SEED = "0123456789abcdef"

/** The salary case, with a plan that states inflation, so the paths' prices all differ. */
const fixture: Fixture = {
	...levySalaryDay,
	scenario: { ...levySalaryDay.scenario, economy: { inflation: 300 } },
}

/** A zero-account market whose only variation is inflation: 0 or 10 per cent a year. */
const model: ReturnModel = {
	id: "two-bucket",
	accounts: [],
	buckets: [
		{ returnsBps: [], weight: FULL / 2 },
		{ returnsBps: [], weight: FULL / 2 },
	],
	inflation: {
		buckets: [
			{ rateBps: 0, weight: FULL / 2 },
			{ rateBps: 1000, weight: FULL / 2 },
		],
	},
}

function path(index: number) {
	const result = projectPath(fixture.baseline, fixture.scenario, fixture.timeline, {
		model,
		seed: SEED,
		paths: 4,
		index,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

describe("a Levy across Market paths that draw inflation", () => {
	it("gives every path the deterministic projection's Levy", () => {
		const plain = project(fixture.baseline, fixture.scenario, fixture.timeline)
		if (!plain.ok) throw new Error(JSON.stringify(plain.problems))
		expect(plain.projection.levies).toBeDefined()
		for (let index = 0; index < 4; index++) {
			expect(path(index).levies).toEqual(plain.projection.levies)
		}
	})

	it("checks the paths really drew different inflation", () => {
		const seen = new Set(
			[0, 1, 2, 3].map((index) => JSON.stringify(path(index).returns?.map((r) => r.inflationBps))),
		)
		expect(seen.size).toBeGreaterThan(1)
	})

	it("runs the same chance over the same paths", () => {
		const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
			model,
			seed: SEED,
			paths: 4,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.chance.realBands).toBeDefined()
	})
})
