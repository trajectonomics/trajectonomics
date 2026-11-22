import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import { errorOf, resultOf, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

/*
 * A milestone's date criterion is a published date, so a household anchors it like a Flow's date
 * (cli ADR-0048). The household writes the date into the criterion; an age criterion is #217, not this.
 */

/** The fixture Scenario with one Milestone whose criterion fires on a date the household will move. */
const WITH_MILESTONE = {
	...SCENARIO_DOCUMENT,
	milestones: [
		{
			id: "retire",
			combine: "all",
			criteria: [{ id: "when", kind: "date", on: "2040-01-01" }],
		},
	],
}

describe("a household anchors a milestone's date criterion", () => {
	it("writes the age-derived date into the criterion, and reads it back from show", async () => {
		const home = scenarioHome()
		await seedBase(home, WITH_MILESTONE)
		const household = {
			...HOUSEHOLD,
			anchors: [
				...HOUSEHOLD.anchors,
				{ path: "milestones.retire.criteria.when.on", person: "me", age: 60 },
			],
		}
		const set = resultOf(await setHousehold(home, household))
		expect(set).toBeDefined()
		const row = await shown(home)
		const criterion = (row.document["milestones"] as { criteria: { on: string }[] }[])[0]
			?.criteria[0]
		expect(criterion?.on).toBe("2050-06-30")
	})

	it("refuses an anchor on a metric's amount, which is not a date", async () => {
		const home = scenarioHome()
		await seedBase(home, {
			...WITH_MILESTONE,
			milestones: [
				{
					id: "retire",
					combine: "all",
					criteria: [
						{
							id: "wealth",
							kind: "metric",
							metric: "netWorth",
							op: "atLeast",
							amount: 1,
							terms: "nominal",
						},
					],
				},
			],
		})
		const household = {
			...HOUSEHOLD,
			anchors: [
				...HOUSEHOLD.anchors,
				{ path: "milestones.retire.criteria.wealth.amount", person: "me", age: 60 },
			],
		}
		const res = await setHousehold(home, household)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.anchors.2.path" })
	})
})
