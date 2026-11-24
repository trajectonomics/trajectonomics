import { describe, expect, test } from "bun:test"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import type { Snapshot } from "../contract"
import { parseSnapshotText } from "./parse-snapshot"
import { scenarioNames } from "./plan"
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
