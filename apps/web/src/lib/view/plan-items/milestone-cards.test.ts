import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { MILESTONE_ROWS, withMilestones } from "../milestones/fixtures.test-support"
import { milestoneCards } from "./milestone-cards"

/** A document whose Milestones state one date, one net-worth target and one that names neither. */
function document(): ScenarioDocument {
	return {
		currency: "THB",
		flows: [],
		accounts: [],
		milestones: [
			{
				id: "first-year",
				displayLabel: "Car paid off",
				combine: "all",
				criteria: [{ id: "date", kind: "date", on: "2026-12-31" }],
			},
			{
				id: "second-year",
				combine: "all",
				criteria: [
					{
						id: "worth",
						kind: "metric",
						metric: "netWorth",
						op: "atLeast",
						amount: "10000000.00",
						terms: "nominal",
					},
				],
			},
			{ id: "never", combine: "all", criteria: [{ id: "a" }, { id: "b" }] },
		],
	} as ScenarioDocument
}
describe("the Plan's compact Milestone cards", () => {
	test("state the date a Milestone is reached, and what it fires on", () => {
		const cards = milestoneCards(document(), withMilestones(MILESTONE_ROWS))
		expect(cards.find((card) => card.id === "first-year")).toEqual({
			id: "first-year",
			date: "31 Dec 2026",
			notReachedBy: null,
			how: "On a date",
		})
		expect(cards.find((card) => card.id === "second-year")?.how).toBe("When net worth reaches 10M")
	})

	test("state the year a Milestone is not reached by, from the plan's own run-out date", () => {
		const run = withMilestones(MILESTONE_ROWS, {
			runsOut: { date: "2053-12-31", unmet: "0.00" },
		})
		expect(milestoneCards(document(), run).find((card) => card.id === "never")).toEqual({
			id: "never",
			date: null,
			notReachedBy: "2053",
			how: "",
		})
	})

	test("list the document's Milestones without a run, with no date to state", () => {
		const cards = milestoneCards(document(), undefined)
		expect(cards.map((card) => card.id)).toEqual(["first-year", "second-year", "never"])
		expect(cards[0]?.date).toBeNull()
	})

	test("say nothing is to say without a document", () => {
		expect(milestoneCards(null, undefined)).toEqual([])
	})
})
