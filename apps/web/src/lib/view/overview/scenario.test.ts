import { describe, expect, test } from "bun:test"
import type { SnapshotParams } from "../../contract"
import { failedRead, okRead } from "./fixtures.test-support"
import { mapScenario, primaryScenario, scenarioView } from "./scenario"

const params = (scenarios: string[], compare: SnapshotParams["compare"]): SnapshotParams => ({
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios,
	compare,
	birthDate: null,
	ages: [],
	historyDates: [],
	allowances: null,
})

describe("primaryScenario", () => {
	test("is the first side of a comparison, when there is one", () => {
		expect(primaryScenario(params(["x", "y"], { a: "y", b: "x" }))).toBe("y")
	})

	test("is otherwise the first Scenario the Snapshot was planned for", () => {
		expect(primaryScenario(params(["x", "y"], null))).toBe("x")
	})

	test("is null when the Snapshot names no Scenario", () => {
		expect(primaryScenario(params([], null))).toBeNull()
	})
})

describe("scenarioView", () => {
	test("is none when there is no Scenario to show", () => {
		expect(scenarioView(null, {})).toEqual({ status: "none" })
	})

	test("is unread when the Snapshot holds no Read for the Scenario", () => {
		expect(scenarioView("base", {})).toEqual({ status: "unread", name: "base" })
	})

	test("does not mistake an inherited property for a Read", () => {
		expect(scenarioView("constructor", {})).toEqual({ status: "unread", name: "constructor" })
	})

	test("is ready with the Scenario's own Read", () => {
		const read = okRead(["fi"], 1)
		expect(scenarioView("base", { base: read })).toEqual({ status: "ready", name: "base", read })
	})
})

describe("mapScenario", () => {
	test("maps the data of a ready Read and keeps a failed one as the CLI said it", () => {
		const ok = mapScenario(scenarioView("base", { base: okRead(["fi"], 2) }), (n) => n * 10)
		expect(ok.status === "ready" && ok.read.ok && ok.read.data).toBe(20)
		const failed = mapScenario(
			scenarioView("base", { base: failedRead<number>(["fi"]) }),
			(n) => n * 10,
		)
		expect(failed.status === "ready" && failed.read.ok).toBe(false)
	})

	test("passes the states without a Read through", () => {
		expect(mapScenario({ status: "none" }, (n: number) => n)).toEqual({ status: "none" })
	})
})
