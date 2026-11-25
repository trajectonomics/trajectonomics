import { describe, expect, it } from "bun:test"
import { applyScenario, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

describe("what an apply took away", () => {
	it("says the Levy was removed when the document holds none", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		const taxed = await scenario(home, [
			"tax",
			"base",
			"--tax",
			"th-2026",
			"--label",
			"salary=income.section40_1",
			"--label",
			"bonus=income.section40_1",
		])
		expect(taxed.code).toBe(0)
		const res = await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect(JSON.parse(res.out).notes).toEqual([
			'The document has no levies, so the Levy "th-2026-pit" was removed; run traj scenario tax again.',
		])
	})

	it("says a dry run would remove it, and names a Levy a document drops among others", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		await scenario(home, [
			"tax",
			"base",
			"--tax",
			"th-2026",
			"--label",
			"salary=income.section40_1",
			"--label",
			"bonus=income.section40_1",
		])
		const dry = await applyScenario(home, "base", SCENARIO_DOCUMENT, ["--dry-run"])
		expect(JSON.parse(dry.out).notes).toEqual([
			'The document has no levies, so the Levy "th-2026-pit" would be removed; run traj scenario tax again.',
		])
		const shown = JSON.parse((await scenario(home, ["show", "base"])).out).scenario.document
		const other = { ...shown.levies[0], id: "other" }
		const kept = { ...shown, levies: [other] }
		const res = await applyScenario(home, "base", kept)
		expect(JSON.parse(res.out).notes).toEqual([
			'The document does not hold the Levy "th-2026-pit", so it was removed; run traj scenario tax again.',
		])
	})

	it("says nothing when no Levy was held", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect(JSON.parse((await applyScenario(home, "base", SCENARIO_DOCUMENT)).out).notes).toEqual([])
	})
})
