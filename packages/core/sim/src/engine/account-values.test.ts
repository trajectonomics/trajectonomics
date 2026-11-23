import { describe, expect, it } from "bun:test"
import type { Derive } from "../types"
import { unchangedValues } from "./account-values"
import { runEngine } from "./run"
import { derivedExpense } from "./test-flows"
import { makeFixture } from "./test-helpers"

const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "home" },
		{ id: "share", op: "scale", of: "value", num: 100, den: 120_000, rounding: "halfUp" },
	],
	result: "share",
}

describe("the Account values an unchanged plan reads", () => {
	const fixture = makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "home", kind: "asset", rate: 300 },
		],
		balances: { cash: 1_000_000_000, home: 500_000_000 },
		flows: [derivedExpense("upkeep", upkeep, { frequency: "monthly", start: "2026-01-01" })],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2027-01-01",
		resolution: "day",
	})
	const values = unchangedValues((observe) =>
		runEngine(fixture.baseline, fixture.scenario, fixture.timeline, [], undefined, false, false, {
			observe,
			gated: false,
		}),
	)

	it("values the home before its landed date's Flows: 500,000,000 on the start", () => {
		expect(values.at("2026-01-01", "home")).toBe(500_000_000n)
	})

	it("values the home after one exact year at 3%: 500,000,000 x 10300 / 10000 is 515,000,000", () => {
		// 2026-01-01 to 2027-01-01 is 365 counted days, so the growth is exactly one year.
		expect(values.at("2027-01-01", "home")).toBe(515_000_000n)
	})

	it("reads a date past the horizon from the last states: two whole years is 530,450,000", () => {
		// 500,000,000 x 10300 x 10300 / 10000 x 10000 is exact, and no Feb 29 falls in 2026 or 2027.
		expect(values.at("2028-01-01", "home")).toBe(530_450_000n)
	})
})
