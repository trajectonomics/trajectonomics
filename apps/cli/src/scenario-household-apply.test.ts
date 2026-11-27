import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
	summariesOf,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

/** The conditional hint the document form gives at every anchorable path (cli ADR-0048). */
const ANCHOR_HINT =
	'If this plan\'s household anchors this date ("traj scenario show <name>" lists its anchors), write any date here and the household sets it; otherwise write the real date.'

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
		expect(errorOf(res).hint).toContain(ANCHOR_HINT)
		expect(errorOf(res).hint).not.toContain("This date is anchored by the household")
	})

	it("gives the same conditional anchor hint on a plan with no household", async () => {
		const home = scenarioHome()
		await seedBase(home)
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
		expect(errorOf(res).hint).toContain(ANCHOR_HINT)
		expect(errorOf(res).hint).not.toContain("This date is anchored by the household")
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
		expect(error.hint).toBe(
			'Remove the --set so the household sets the date, or run "traj scenario fork base late" first, then "traj scenario household late --file <path>" to move the anchor.',
		)
	})

	it("refuses a taken fork name before an anchored --set, and writes nothing", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const early = rowOf(resultOf(await scenario(home, ["fork", "base", "early"])))
		const res = await scenario(home, [
			"fork",
			"base",
			"early",
			"--set",
			'flows.salary.start="2030-01-01"',
		])
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_name_taken",
			path: "name",
			details: { scenarioId: early.id },
		})
		expect(
			summariesOf(resultOf(await scenario(home, ["list"])))
				.map((one) => one.name)
				.sort(),
		).toEqual(["base", "early"])
		expect(rowOf(resultOf(await scenario(home, ["show", "early"])))).toMatchObject({
			contentHash: early.contentHash,
			version: early.version,
		})
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
