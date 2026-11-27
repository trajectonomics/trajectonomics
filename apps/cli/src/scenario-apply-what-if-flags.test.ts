// `scenario apply <name> --set/--without`: its household, its flags and what it prints (cli ADR-0048, ADR-0057).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import { applyScenario, errorOf, scenarioHome } from "./scenario-test-support"
import { apply, bodyOf, stored } from "./scenario-what-if-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

describe("scenario apply --set, with a household", () => {
	it("refuses a Set that moves an anchored date, at its document path, with the anchor", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const before = await stored(home)
		const res = await apply(home, ["base", "--set", 'flows.salary.end="2030-01-01"'])
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
		expect(error.hint).toContain('--set flows.salary.end="2030-01-01"')
		expect((await stored(home)).row).toEqual(before.row)
	})

	it("drops the anchor of a removed item and lists it in droppedAnchors", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, HOUSEHOLD)
		const res = await apply(home, ["base", "--without", "flows.bonus"])
		expect(res.code).toBe(0)
		expect(bodyOf(res)).toMatchObject({ status: "updated", droppedAnchors: ["flows.bonus.end"] })
		expect((await shown(home)).household).toMatchObject({ anchors: [HOUSEHOLD.anchors[0]] })
	})
})

describe("scenario apply --set, its flags and its result", () => {
	it("refuses --set beside --file, at --file, with the hint that names the what-if form", async () => {
		const home = scenarioHome()
		const res = await capture(
			["scenario", "apply", "base", "--file", "-", "--set", "flows.rent.amount=1", "--json"],
			{ TRAJ_HOME: home },
		)
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({ code: "invalid_input", path: "--file" })
		expect(error.message).toContain("--set")
		expect(error.hint).toContain("traj scenario apply <name> --set <path=value>")
	})

	it("refuses --without beside --file, with the same hint", async () => {
		const home = scenarioHome()
		const res = await capture(
			["scenario", "apply", "base", "--file", "-", "--without", "flows.rent", "--json"],
			{ TRAJ_HOME: home },
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: "--file" })
		expect(errorOf(res).hint).toContain("--without <id>")
	})

	it("refuses --set with --template, at --set, and names the form that takes it", async () => {
		const res = await capture(
			["scenario", "apply", "--template", "--set", "flows.rent.amount=1", "--json"],
			{ TRAJ_HOME: scenarioHome() },
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--set" })
		expect(errorOf(res).hint).toContain("traj scenario apply <name> --set")
	})

	it("refuses a what-if with no name, at the name", async () => {
		const res = await apply(scenarioHome(), ["--set", "flows.rent.amount=1"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "name" })
	})

	it("keeps the document form's output free of the what-if fields", async () => {
		const res = await applyScenario(scenarioHome(), "base", SCENARIO_DOCUMENT)
		expect(res.code).toBe(0)
		const body = bodyOf(res)
		expect(body).not.toHaveProperty("overrides")
		expect(body).not.toHaveProperty("removals")
	})

	it("prints the apply's result with the overrides and removals it wrote", async () => {
		const home = await projectionHome()
		const res = await apply(home, [
			"base",
			"--without",
			"flows.rent",
			"--set",
			"flows.salary.amount=9000000",
		])
		expect(res.code).toBe(0)
		expect(Object.keys(bodyOf(res)).sort()).toEqual([
			"droppedAnchors",
			"dryRun",
			"notes",
			"overrides",
			"removals",
			"scenario",
			"status",
		])
	})
})

describe("traj schema scenario apply, for the what-if form", () => {
	it("publishes --set and --without as flags of the command, and names the form in its description", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"])
		expect(res.code).toBe(0)
		const described = JSON.parse(res.out)
		expect(described.input.properties.set).toMatchObject({ flag: "--set" })
		expect(described.input.properties.set.description).toContain(
			"Applied to the stored plan, the Set is saved.",
		)
		expect(described.input.properties.without).toMatchObject({ flag: "--without" })
		expect(described.input.properties.add).toMatchObject({ flag: "--add" })
		expect(described.description).toContain("--set, --without and --add")
	})
})
