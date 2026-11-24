import { describe, expect, it } from "bun:test"
import { applyScenario, errorOf, resultOf, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

async function twoPlans(): Promise<string> {
	const home = scenarioHome()
	await applyScenario(home, "base", SCENARIO_DOCUMENT)
	await applyScenario(home, "early", SCENARIO_DOCUMENT)
	return home
}

async function mainsOf(home: string): Promise<string[]> {
	const list = resultOf(await scenario(home, ["list"])).scenarios
	return list.filter((s: { main: boolean }) => s.main).map((s: { name: string }) => s.name)
}

describe("scenario main (cli ADR-0071)", () => {
	it("marks one plan, and show and list say so", async () => {
		const home = await twoPlans()
		const res = await scenario(home, ["main", "base"])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data).toMatchObject({ dryRun: false, status: "set", scenario: { name: "base" } })
		expect(data.previous).toBeNull()
		expect(await mainsOf(home)).toEqual(["base"])
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.main).toBe(true)
		expect(resultOf(await scenario(home, ["show", "early"])).scenario.main).toBe(false)
	})

	it("moves the mark, naming the plan it left, and keeps one main plan", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		const res = await scenario(home, ["main", "early"])
		expect(resultOf(res)).toMatchObject({
			status: "moved",
			scenario: { name: "early" },
			previous: { name: "base" },
		})
		expect(await mainsOf(home)).toEqual(["early"])
	})

	it("is true already when the plan is the main plan", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		const res = await scenario(home, ["main", "base"])
		expect(res.code).toBe(0)
		expect(resultOf(res)).toMatchObject({ status: "unchanged", scenario: { name: "base" } })
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.version).toBe(2)
	})

	it("clears the mark, and clearing with none marked is true already", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		const cleared = resultOf(await scenario(home, ["main", "--clear"]))
		expect(cleared).toMatchObject({ status: "cleared", scenario: null, previous: { name: "base" } })
		expect(await mainsOf(home)).toEqual([])
		const again = resultOf(await scenario(home, ["main", "--clear"]))
		expect(again).toMatchObject({ status: "unchanged", scenario: null, previous: null })
	})

	it("changes neither the document nor the hash", async () => {
		const home = await twoPlans()
		const before = resultOf(await scenario(home, ["show", "base"])).scenario
		await scenario(home, ["main", "base"])
		const after = resultOf(await scenario(home, ["show", "base"])).scenario
		expect(after.contentHash).toBe(before.contentHash)
		expect(after.document).toEqual(before.document)
	})

	it("is not a default: a fork is not the main plan, and reads still name their plan", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		await scenario(home, ["fork", "base", "copy"])
		expect(await mainsOf(home)).toEqual(["base"])
		const run = await scenario(home, ["diff", "base"])
		expect(run.code).toBe(2)
	})

	it("refuses rm of the main plan with a hint naming scenario main", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		const res = await scenario(home, ["rm", "base"])
		expect(res.code).toBe(5)
		const error = errorOf(res)
		expect(error.code).toBe("scenario_is_main")
		expect(error.hint).toContain("traj scenario main")
		expect(await mainsOf(home)).toEqual(["base"])
		expect((await scenario(home, ["rm", "early"])).code).toBe(0)
	})

	it("removes the main plan under --force and takes the mark off", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		const dry = resultOf(await scenario(home, ["rm", "base", "--force", "--dry-run"]))
		expect(dry).toMatchObject({ dryRun: true, mainCleared: true })
		expect(await mainsOf(home)).toEqual(["base"])
		const res = await scenario(home, ["rm", "base", "--force"])
		expect(res.code).toBe(0)
		expect(resultOf(res).mainCleared).toBe(true)
		expect(await mainsOf(home)).toEqual([])
		// The name is free again, and the new plan is not main.
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect(await mainsOf(home)).toEqual([])
	})

	it("does not mention mainCleared when the plan was not main", async () => {
		const home = await twoPlans()
		expect(resultOf(await scenario(home, ["rm", "early", "--force"]))).not.toHaveProperty(
			"mainCleared",
		)
	})

	it("names a plan or --clear, not both and not neither", async () => {
		const home = await twoPlans()
		for (const argv of [["main"], ["main", "base", "--clear"]]) {
			const res = await scenario(home, argv)
			expect(res.code).toBe(2)
			expect(errorOf(res).code).toBe("invalid_input")
		}
		expect((await scenario(home, ["main", "nope"])).code).toBe(4)
	})

	it("rolls back under --dry-run", async () => {
		const home = await twoPlans()
		await scenario(home, ["main", "base"])
		const res = await scenario(home, ["main", "early", "--dry-run"])
		expect(resultOf(res)).toMatchObject({ dryRun: true, status: "moved" })
		expect(await mainsOf(home)).toEqual(["base"])
	})
})
