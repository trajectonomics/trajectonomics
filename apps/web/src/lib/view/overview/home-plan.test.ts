import { describe, expect, test } from "bun:test"
import { ledgerWith } from "../plans/fixtures.test-support"
import { homePlan, primaryScenario, requestedPlan } from "./scenario"
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

	test("is the plan a What-if session holds changes on when the address bar names none", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		expect(homePlan(snapshot, requestedPlan("", "base"))).toBe("base")
		expect(homePlan(snapshot, requestedPlan("", null))).toBe("retire-early")
	})

	test("the address bar wins over the session", () => {
		expect(requestedPlan("retire-early", "base")).toBe("retire-early")
	})

	test("a session on a plan the dashboard does not project is passed over for the main plan", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		expect(homePlan(snapshot, requestedPlan("", "gone"))).toBe("retire-early")
	})

	test("the cards read that plan's figures", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		const view = overviewView(snapshot)
		expect(view.fi.status === "ready" && view.fi.name).toBe("retire-early")
		const named = overviewView(snapshot, "base")
		expect(named.fi.status === "ready" && named.fi.name).toBe("base")
	})
})
