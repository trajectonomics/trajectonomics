import { describe, expect, it } from "bun:test"
import { chanceOfSuccess } from "../chance/chance-of-success"
import { project } from "../engine/project"
import { financialIndependence } from "../fi/financial-independence"
import {
	goldenBaseline as baseline,
	goldenModel as model,
	goldenScenario as scenario,
	goldenTimeline as timeline,
} from "./metric-golden-plan"

/**
 * Figures recorded from the engine before metric evaluation was made cheaper (#264), which changed
 * no figure: a liabilities Milestone and a balance Milestone each fire and gate a Flow, and an
 * expense-window Milestone never does, so every kind of metric read is on the path of each run.
 */
const seed = "0123456789abcdef"
const SLOW = 60_000

describe("a plan with metric Milestones keeps its recorded figures", () => {
	it("projects the fire dates", () => {
		const result = project(baseline, scenario, timeline)
		expect(result.ok && result.projection.milestones).toEqual([
			{ id: "recovered", reached: true, date: "2030-04-25" },
			{ id: "buffered", reached: true, date: "2027-01-01" },
			{ id: "covered", reached: false },
		])
	})

	it(
		"runs 20 Market paths to the recorded chance of success",
		() => {
			const result = chanceOfSuccess(baseline, scenario, timeline, { model, seed, paths: 20 })
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const { chance } = result
			expect([chance.succeeded, chance.successBps]).toEqual([20, 10000])
			expect(chance.runsOut.filter((period) => period.paths > 0)).toEqual([])
			const last = chance.bands[chance.bands.length - 1]!
			expect([last.to, last.netWorth.map((item) => item.value)]).toEqual([
				"2032-01-01",
				[77896392, 83038802, 88685699, 93259132, 98029608],
			])
		},
		SLOW,
	)

	it(
		"finds no survival FI month under a six-month buffer, bound by the buffer",
		() => {
			const result = financialIndependence(baseline, scenario, timeline, {
				method: "survival",
				minBufferMonths: 6,
			})
			expect(result).toEqual({
				ok: true,
				financialIndependence: {
					reachable: false,
					definition: { method: "survival", minBufferMonths: 6, definitionVersion: 1 },
					binding: "minimumBuffer",
					bestCase: {
						month: "2032-01-01",
						bufferBreach: { date: "2032-01-01", required: 20178666, accessible: -29927456 },
					},
				},
			})
		},
		SLOW,
	)

	it(
		"finds the recorded probability FI month over four Market paths",
		() => {
			const options = {
				method: "probabilityThreshold",
				thresholdBps: 7000,
				paths: 4,
				seed,
			} as const
			const result = financialIndependence(baseline, scenario, timeline, options, model)
			expect(result).toEqual({
				ok: true,
				financialIndependence: {
					reachable: true,
					definition: { ...options, modelId: "golden", definitionVersion: 1 },
					month: "2030-04-01",
					fiSurvivalBps: 7500,
				},
			})
		},
		SLOW,
	)
})
