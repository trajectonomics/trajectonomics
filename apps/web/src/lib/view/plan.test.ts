import { describe, expect, test } from "bun:test"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import type { Snapshot } from "../contract"
import { parseSnapshotText } from "./parse-snapshot"
import { chooseScenario, scenarioNames } from "./plan"
import { LOADING } from "./state"

const DEMO_TEXT = await demoSnapshotText()

function demoSnapshot(): Snapshot {
	const result = parseSnapshotText(DEMO_TEXT)
	if (!result.ok) throw new Error(`the Demo snapshot does not parse: ${result.reason}`)
	return result.snapshot
}

describe("scenarioNames", () => {
	test("lists the Scenarios a ready Snapshot holds, in the Snapshot's order", () => {
		const snapshot = demoSnapshot()
		expect(scenarioNames({ status: "ready", url: "/demo/snapshot.json", snapshot })).toEqual([
			"base",
			"retire-early",
		])
	})

	test("is empty when the Snapshot names no Scenario", () => {
		const snapshot = demoSnapshot()
		const bare = { ...snapshot, params: { ...snapshot.params, scenarios: [] } }
		expect(scenarioNames({ status: "ready", url: "/demo/snapshot.json", snapshot: bare })).toEqual(
			[],
		)
	})

	test("is empty while the Snapshot loads, or when there is none to read", () => {
		expect(scenarioNames(LOADING)).toEqual([])
		expect(scenarioNames({ status: "missing", url: "/snapshot.json" })).toEqual([])
		expect(
			scenarioNames({
				status: "invalid",
				url: "/snapshot.json",
				reason: "is not JSON",
				details: [],
			}),
		).toEqual([])
	})
})

describe("chooseScenario", () => {
	const names = ["base", "retire-early"]

	test("shows the Scenario the address bar names when it is one of the names", () => {
		expect(chooseScenario(names, "retire-early")).toBe("retire-early")
	})

	test("falls back to the first Scenario when the address bar names an unknown one or none", () => {
		expect(chooseScenario(names, "no-such-scenario")).toBe("base")
		expect(chooseScenario(names, "")).toBe("base")
	})

	test("has no Scenario to show when there are no names", () => {
		expect(chooseScenario([], "base")).toBeNull()
	})

	test("keeps the Snapshot's order, so an integer-like name does not jump to the front", () => {
		// Object.keys puts "2030" first; the rule reads the Snapshot's list, not an object's keys.
		const planned = ["retire", "2030"]
		expect(chooseScenario(planned, "")).toBe("retire")
		expect(chooseScenario(planned, "2030")).toBe("2030")
	})
})
