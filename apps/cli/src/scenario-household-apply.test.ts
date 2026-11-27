import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import { applyScenario, errorOf, resultOf, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

describe("scenario household, and the writes that keep it", () => {
	it("refuses an apply that changes an anchored date, and names the anchor", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const document = (await shown(home)).document
		const changed = {
			...document,
			flows: [{ ...document.flows[0], end: "2030-01-01" }, document.flows[1]],
		}
		const res = await applyScenario(home, "base", changed)
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "document.flows.0.end",
			details: {
				anchor: { path: "flows.salary.end", person: "me", age: 60 },
				anchored: "2050-06-30",
			},
		})
		expect(error.hint).toContain("traj scenario household base")
	})

	it("fills an anchored date an apply leaves out, and drops the anchor of a Flow it removes", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const withoutBonus = { ...SCENARIO_DOCUMENT, flows: [SCENARIO_DOCUMENT.flows[0]] }
		const applied = resultOf(await applyScenario(home, "base", withoutBonus))
		expect(applied).toMatchObject({ status: "updated", droppedAnchors: ["flows.bonus.end"] })
		const row = await shown(home)
		expect(row.document.flows).toEqual([{ ...SCENARIO_DOCUMENT.flows[0], end: "2050-06-30" }])
		expect(row.household).toMatchObject({
			people: HOUSEHOLD.people,
			anchors: [HOUSEHOLD.anchors[0]],
		})
	})

	it("hints at the household when an apply leaves out a required anchored date", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, {
			...HOUSEHOLD,
			anchors: [{ path: "flows.salary.start", person: "me", age: 36 }],
		})
		const document = (await shown(home)).document
		const { start: _start, ...salary } = document.flows[0] as Record<string, unknown>
		const res = await applyScenario(home, "base", {
			...document,
			flows: [salary, document.flows[1]],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.flows.0.start",
		})
		expect(errorOf(res).hint).toContain("anchored by the household")
	})

	it("copies the household on a fork, and refuses a --set that moves an anchored date", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const plain = resultOf(await scenario(home, ["fork", "base", "early"]))
		expect(plain.droppedAnchors).toEqual([])
		expect((await shown(home, "early")).household).toEqual(HOUSEHOLD)
		const moved = await scenario(home, [
			"fork",
			"base",
			"late",
			"--set",
			'flows.salary.end="2030-01-01"',
		])
		expect(moved.code).toBe(2)
		const error = errorOf(moved)
		expect(error).toMatchObject({ code: "invalid_input", path: "document.flows.0.end" })
		expect(error.hint).toContain("scenario household late")
		expect(error.hint).not.toContain("household base")
	})

	it("publishes the household's document schema with one labelled example", async () => {
		const res = await capture(["schema", "scenario", "household", "--json"])
		expect(res.code).toBe(0)
		const schema = JSON.parse(res.out).document.schema
		expect(schema.examples).toHaveLength(1)
		expect(schema.description).toContain("example")
		expect(schema.required).toEqual(["schemaVersion", "people", "anchors"])
	})
})
