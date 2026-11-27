import { describe, expect, it } from "bun:test"
import {
	captureChance,
	flags,
	milestonedHome,
	milestoneFlags,
} from "./projection-chance-milestones-support"
import { chanceBody, modelFile } from "./projection-chance-support"
import { scenario } from "./scenario-test-support"

describe("projection chance --milestone-dates' flags", () => {
	it("adds no milestones field without the flag, and an empty list on a plan with none", async () => {
		const home = await milestonedHome()
		const model = modelFile(home)
		const plain = chanceBody(await captureChance(home, flags(model)))
		expect(plain.milestones).toBeUndefined()
		const none = chanceBody(
			await captureChance(home, [...flags(model, "base"), "--milestone-dates"]),
		)
		expect(none.milestones).toEqual([])
	})

	it("puts each path's fired dates in its outcome with --outcomes, and none without the flag", async () => {
		const home = await milestonedHome()
		const model = modelFile(home)
		const both = chanceBody(await captureChance(home, [...milestoneFlags(model), "--outcomes"]))
		expect(both.outcomes?.[0]?.milestones).toMatchObject({ stop: "2026-09-30" })
		const outcomes = chanceBody(await captureChance(home, [...flags(model), "--outcomes"]))
		expect(outcomes.outcomes?.[0]).not.toHaveProperty("milestones")
	})

	it("prints the fired dates of each path, by id, in the outcomes table", async () => {
		const home = await milestonedHome()
		const res = await captureChance(home, [...milestoneFlags(modelFile(home)), "--outcomes"], false)
		expect(res.code).toBe(0)
		expect(res.out).toContain("milestones")
		expect(res.out).toContain("stop 2026-09-30")
	})

	it("marks a plan with Milestones in scenario list, so the Snapshot asks for their dates", async () => {
		const home = await milestonedHome()
		const res = await scenario(home, ["list"])
		expect(res.code).toBe(0)
		const rows = (JSON.parse(res.out) as { scenarios: { name: string; hasMilestones: boolean }[] })
			.scenarios
		expect(rows.find((row) => row.name === "milestoned")?.hasMilestones).toBe(true)
		expect(rows.find((row) => row.name === "base")?.hasMilestones).toBe(false)
	})

	it("publishes the flag and the result fields in traj schema", async () => {
		const res = await captureChance(await milestonedHome(), ["schema", "projection", "chance"])
		expect(res.code).toBe(0)
		const detail = JSON.parse(res.out) as {
			input: { properties: Record<string, { flag?: string }> }
			output: { properties: Record<string, unknown> }
		}
		expect(detail.input.properties["milestoneDates"]?.flag).toBe("--milestone-dates")
		expect(detail.output.properties["milestones"]).toBeDefined()
		expect(detail.output.properties["outcomes"]).toBeDefined()
	})
})
