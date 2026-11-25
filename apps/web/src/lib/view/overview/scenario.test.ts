import { describe, expect, test } from "bun:test"
import { failedRead, okRead } from "./fixtures.test-support"
import { mapScenario, scenarioView } from "./scenario"

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
