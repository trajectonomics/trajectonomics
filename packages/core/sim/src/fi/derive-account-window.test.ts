import { describe, expect, it } from "bun:test"
import { derivedExpense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Derive, SurvivalOptions } from "../types"
import { expenseBetween } from "./expense-window"
import { windowPlan } from "./windows"

/** 1% a year of the home's value, paid each January (ADR 0020). */
const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "home" },
		{ id: "share", op: "scale", of: "value", num: 100, den: 10_000, rounding: "halfUp" },
	],
	result: "share",
}

describe("a Financial Independence window that plans an Account-reading expense", () => {
	const fixture = makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "home", kind: "asset", rate: 300 },
		],
		balances: { cash: 1_000_000_000, home: 500_000_000 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2028-01-01",
		resolution: "day",
		flows: [derivedExpense("upkeep", upkeep, { frequency: "annual", start: "2026-01-01" })],
	})
	const options: SurvivalOptions = { method: "survival" }

	it("plans each January's upkeep from the unchanged plan's home value: 5,000,000 then 5,150,000", () => {
		const windows = windowPlan(
			fixture.baseline,
			fixture.scenario,
			fixture.timeline,
			options,
			"2026-01-01",
			undefined,
		).forFires(new Map())
		expect(expenseBetween(windows.reference.window, "2026-01-01", "2027-01-01")).toEqual({
			kind: "ok",
			amount: 5_000_000n,
		})
		expect(expenseBetween(windows.reference.window, "2027-01-01", "2028-01-01")).toEqual({
			kind: "ok",
			amount: 5_150_000n,
		})
	})
})
