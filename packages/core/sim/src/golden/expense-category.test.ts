import { describe, expect, it } from "bun:test"
import { check } from "../check"
import { project } from "../engine/project"
import { freelancer } from "../fixtures/freelancer"
import { chanceOfSuccess, financialIndependence } from "../index"
import type { Flow, Scenario } from "../types"
import { freelancerChance } from "./chance-cases"
import { categorisedFreelancer } from "./expense-category-cases"

/** The freelancer Scenario with a second expense, and categories on both expenses and on none. */
const categorised: Scenario = {
	...freelancer.scenario,
	flows: [
		...freelancer.scenario.flows.map((flow): Flow => {
			if (flow.kind !== "expense") return flow
			return { ...flow, category: "essentials" }
		}),
		{
			id: "school-fees",
			kind: "expense",
			amount: 300_000,
			frequency: "quarterly",
			start: "2026-03-01",
			growth: "inflation",
			category: "children's school".padEnd(64, "x"),
		},
	],
}

/** The same Scenario with every `category` key removed: the reference the figures must equal. */
function stripCategory(flow: Flow): Flow {
	if (flow.kind !== "expense") return flow
	const { category: _category, ...rest } = flow
	return rest
}

const uncategorised: Scenario = { ...categorised, flows: categorised.flows.map(stripCategory) }

const { baseline, timeline } = freelancer
const fi = { method: "survival" } as const

describe("an expense category changes no figure", () => {
	it("is a valid Scenario with categories, and one without", () => {
		expect(check(baseline, categorised, timeline)).toEqual([])
		expect(check(baseline, uncategorised, timeline)).toEqual([])
	})

	it("gives the same Projection, FI answer and chance result with and without categories", () => {
		const withCategories = {
			projection: project(baseline, categorised, timeline),
			fi: financialIndependence(baseline, categorised, timeline, fi),
			chance: chanceOfSuccess(baseline, categorised, timeline, freelancerChance),
		}
		const without = {
			projection: project(baseline, uncategorised, timeline),
			fi: financialIndependence(baseline, uncategorised, timeline, fi),
			chance: chanceOfSuccess(baseline, uncategorised, timeline, freelancerChance),
		}
		expect(JSON.stringify(withCategories)).toBe(JSON.stringify(without))
	})

	it("gives the same Projection when a fixture's only expense is categorised", () => {
		expect(JSON.stringify(project(baseline, categorisedFreelancer.scenario, timeline))).toBe(
			JSON.stringify(project(baseline, freelancer.scenario, timeline)),
		)
	})
})
