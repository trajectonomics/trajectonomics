import { describe, expect, it } from "bun:test"
import { carryInFile, taxedHome } from "./projection/carry-in-support"
import { CARRY_IN_EXAMPLE } from "./projection/carryin"
import { projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { scenario } from "./scenario-test-support"

/** The Levy ids a Scenario's stored document declares, as `scenario show` prints them. */
async function levyIdsOf(home: string, name: string): Promise<string[]> {
	const res = await scenario(home, ["show", name])
	expect(res.code).toBe(0)
	const document = (JSON.parse(res.out) as { scenario: { document: { levies: { id: string }[] } } })
		.scenario.document
	return document.levies.map((levy) => levy.id)
}

describe("the --carry-in example in traj schema", () => {
	it("names the Levy that scenario tax --tax th-2026 writes", async () => {
		const home = await taxedHome()
		const example = CARRY_IN_EXAMPLE[0]
		expect(example?.levy).toBeDefined()
		expect(await levyIdsOf(home, "base")).toContain(example?.levy ?? "")
	})

	it("is accepted as written by a Projection of that Scenario", async () => {
		const levy = CARRY_IN_EXAMPLE[0]?.levy ?? ""
		const home = await taxedHome()
		const res = await projection(home, [
			"run",
			"--scenario",
			"base",
			"--as-of",
			"2025-06-01",
			"--horizon",
			"2026-12-31",
			"--carry-in",
			carryInFile(home, CARRY_IN_EXAMPLE),
		])
		expect(res.code).toBe(0)
		expect(runBody(res).carryIn?.map((it) => it.levy)).toEqual([levy])
	})
})
