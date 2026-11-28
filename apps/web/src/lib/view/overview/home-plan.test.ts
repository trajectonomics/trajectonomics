import { describe, expect, test } from "bun:test"
import { ledgerWith } from "../plans/fixtures.test-support"
import { homePlan } from "./scenario"
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

	test("a comparison does not choose the plan: the Snapshot's order does, main first", () => {
		const snapshot = {
			...ledgerWith({ base: {}, "retire-early": {} }),
			params: params(["base", "retire-early"], { a: "retire-early", b: "base" }),
		}
		expect(homePlan(snapshot, "")).toBe("base")
	})

	test("the cards read that plan's figures", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		const view = overviewView(snapshot)
		expect(view.projection.status === "ready" && view.projection.name).toBe("retire-early")
		const named = overviewView(snapshot, "base")
		expect(named.projection.status === "ready" && named.projection.name).toBe("base")
	})
})
