import { describe, expect, test } from "bun:test"
import { ledgerWith } from "../plans/fixtures.test-support"
import { homePlan, primaryScenario } from "./scenario"
import { overviewView } from "./view"

const params = (scenarios: string[], compare: { a: string; b: string } | null = null) => ({
	...ledgerWith({ base: {} }).params,
	scenarios,
	compare,
})

describe("the plan Home follows", () => {
	test("is the plan the address bar names", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		expect(homePlan(snapshot, "base")).toBe("base")
	})

	test("is the main plan when the address bar names none, or names one the dashboard does not project", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		expect(homePlan(snapshot, "")).toBe("retire-early")
		expect(homePlan(snapshot, "gone")).toBe("retire-early")
	})

	test("is the first plan when no plan is main, as it was before", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": {} })
		expect(homePlan(snapshot, "")).toBe("base")
	})

	test("passes over a main plan the dashboard does not project", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": {}, other: { main: true } })
		expect(homePlan(snapshot, "")).toBe("base")
	})

	test("the main plan comes before the plan a comparison names first", () => {
		expect(primaryScenario(params(["a", "b"], { a: "b", b: "a" }), "", "a")).toBe("a")
		expect(primaryScenario(params(["a", "b"], { a: "b", b: "a" }))).toBe("b")
	})

	test("the cards read that plan's figures", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		const view = overviewView(snapshot)
		expect(view.fi.status === "ready" && view.fi.name).toBe("retire-early")
		const named = overviewView(snapshot, "base")
		expect(named.fi.status === "ready" && named.fi.name).toBe("base")
	})
})
