import { describe, expect, it } from "bun:test"
import { recordedValues } from "./account-values"
import { createStates } from "./state"
import { makeFixture } from "./test-helpers"

const fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "home", kind: "asset", rate: 300 },
	],
	balances: { cash: 1_000_000_000, home: 500_000_000 },
	surplus: [{ account: "cash" }],
	start: "2026-01-01",
	horizon: "2028-01-01",
})
const start = "2026-01-01"
const states = () => createStates(fixture.baseline, fixture.scenario, start)

describe("the Account values a walk records before each date's Flows", () => {
	it("holds the home's value on a recorded date: 500,000,000 on the start", () => {
		const held = states()
		const values = recordedValues(["home"], held)
		values.record(start, held)
		expect(values.at(start, "home")).toBe(500_000_000n)
	})

	it("records the value as of the date it is called, growth to that date included", () => {
		const held = states()
		const values = recordedValues(["home"], held)
		// 2026-01-01 to 2027-01-01 is 365 counted days: 500,000,000 x 10300 / 10000 is 515,000,000.
		values.record("2027-01-01", held)
		expect(values.at("2027-01-01", "home")).toBe(515_000_000n)
	})

	it("reads a date before `from` from the walk beneath it, whatever it recorded itself", () => {
		const held = states()
		const beneath = recordedValues(["home"], held)
		beneath.record(start, held)
		const values = recordedValues(["home"], held, { from: "2027-01-01", values: beneath })
		expect(values.at(start, "home")).toBe(500_000_000n)
	})

	it("reads a date it never reached from the states it ended with: two years is 530,450,000", () => {
		// 500,000,000 x 10300 x 10300 / 10000 x 10000 is exact, and no Feb 29 falls in 2026 or 2027.
		const values = recordedValues(["home"], states())
		expect(values.at("2028-01-01", "home")).toBe(530_450_000n)
	})
})
