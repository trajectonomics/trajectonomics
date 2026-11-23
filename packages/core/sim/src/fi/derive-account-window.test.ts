import { describe, expect, it } from "bun:test"
import type { AccountValues } from "../engine/account-values"
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
	const plan = windowPlan(fixture.scenario, fixture.timeline, options, "2026-01-01", undefined)

	it("shares no window across candidates, since each candidate's own walk holds its values", () => {
		expect(plan.shared).toBeUndefined()
		expect(plan.reads).toEqual(["home"])
	})

	it("prices each January's upkeep from the values it is given: 1% of 500,000,000 then 515,000,000", () => {
		const walk: AccountValues = {
			at: (date) => (date < "2027-01-01" ? 500_000_000n : 515_000_000n),
		}
		const { reference } = plan.forFires(new Map(), walk)
		expect(expenseBetween(reference.window, "2026-01-01", "2027-01-01")).toEqual({
			kind: "ok",
			amount: 5_000_000n,
		})
		expect(expenseBetween(reference.window, "2027-01-01", "2028-01-01")).toEqual({
			kind: "ok",
			amount: 5_150_000n,
		})
	})

	it("prices them again from other values: a candidate whose home was never bought pays nothing", () => {
		const { reference } = plan.forFires(new Map(), { at: () => 0n })
		expect(expenseBetween(reference.window, "2026-01-01", "2028-01-01")).toEqual({
			kind: "ok",
			amount: 0n,
		})
	})

	it("continues the walk a year past the horizon, through the windows' last date", () => {
		expect(plan.tail.horizon).toBe("2028-01-01")
		expect(plan.tail.through).toBe("2029-01-01")
		expect(plan.tail.events.map((event) => event.date)).toEqual(["2029-01-01"])
	})
})
