import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import { errorOf, resultOf, rowOf, scenario, scenarioHome } from "./scenario-test-support"
import type { Captured } from "./test-support"

type Flow = { id: string; amount?: number }

/** The Flows of the Scenario a fork result stores, by id and amount. */
function flowsOf(res: Captured): Flow[] {
	return (rowOf(resultOf(res)).document as { flows: Flow[] }).flows
}

describe("scenario fork --without", () => {
	it("persists the removal in the fork and leaves the source as it was", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const before = (await shown(home)).document
		const res = await scenario(home, ["fork", "base", "early", "--without", "flows.bonus"])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data.removals).toEqual(["flows.bonus"])
		expect(data.overrides).toEqual([])
		expect(flowsOf(res).map((flow) => flow.id)).toEqual(["salary"])
		expect((await shown(home)).document).toEqual(before)
	})

	it("lists the household anchor of a removed item as dropped, and keeps the others", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const res = await scenario(home, ["fork", "base", "early", "--without", "flows.bonus"])
		expect(res.code).toBe(0)
		expect(resultOf(res).droppedAnchors).toEqual(["flows.bonus.end"])
		expect((await shown(home, "early")).household).toMatchObject({
			anchors: [HOUSEHOLD.anchors[0]],
		})
	})

	it("persists a decimal Set in minor units, and echoes the decimal value it was given", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await scenario(home, [
			"fork",
			"base",
			"early",
			"--set",
			'flows.salary.amount="90000.50"',
			"--decimal",
		])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data.overrides).toEqual([{ path: "flows.salary.amount", value: "90000.50" }])
		const salary = flowsOf(res).find((flow) => flow.id === "salary")
		expect(salary?.amount).toBe(9_000_050)
	})

	it("refuses a path that names no list item, at the --without", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await scenario(home, ["fork", "base", "early", "--without", "flows.nope"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--without",
			details: { index: 0, segment: "nope" },
		})
	})
})
