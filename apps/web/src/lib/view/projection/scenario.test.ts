import { describe, expect, test } from "bun:test"
import { chooseScenario, projectionNames } from "./scenario"
import { parseTerms } from "./terms"

describe("chooseScenario", () => {
	const names = ["base", "retire-early"]

	test("shows the Scenario the address bar names when it is one of the names", () => {
		expect(chooseScenario(names, "retire-early")).toBe("retire-early")
	})

	test("falls back to the first Scenario when the address bar names an unknown one", () => {
		expect(chooseScenario(names, "no-such-scenario")).toBe("base")
	})

	test("falls back to the first Scenario when the address bar names none", () => {
		expect(chooseScenario(names, "")).toBe("base")
	})

	test("has no Scenario to show when there are no names", () => {
		expect(chooseScenario([], "base")).toBeNull()
	})
})

describe("projectionNames", () => {
	test("offers the Scenarios that have a projection Read, in the Snapshot's order", () => {
		expect(projectionNames({ first: { ok: true }, second: { ok: false } })).toEqual([
			"first",
			"second",
		])
	})
})

describe("parseTerms", () => {
	test("reads the three terms the chart offers", () => {
		expect(parseTerms("nominal")).toBe("nominal")
		expect(parseTerms("real")).toBe("real")
		expect(parseTerms("both")).toBe("both")
	})

	test("shows both terms when the address bar names a term this page does not know", () => {
		expect(parseTerms("nominal-and-more")).toBe("both")
		expect(parseTerms("")).toBe("both")
	})
})
