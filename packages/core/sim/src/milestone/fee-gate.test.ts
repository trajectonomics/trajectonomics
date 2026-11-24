import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import { amounts, rowAt } from "../engine/test-rows"
import type { Account, Flow, Milestone, Projection } from "../types"
import { firedOn, milestoned } from "./test-milestones"

/** Cash 1,000 at 0 and a salary of 1,000 on each 1st: net worth first reaches 3,500 on 1 Apr 2026. */
const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const rich: Milestone = {
	id: "rich",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: 3500, terms: "nominal" },
	],
}
const salary = income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })
const gated: Flow = {
	...expense("bonus", 1, { frequency: "once", start: "2026-01-01" }),
	startAt: "rich",
}

/** An empty Account `other` that charges a fee: a fee of 0 on a balance of 0, month end after month end. */
const other = (bps: number): Account => ({
	id: "other",
	kind: "asset",
	rate: 0,
	fee: { bps, rounding: "floor" },
})

function setup(accounts: readonly Account[]): Setup {
	return {
		accounts,
		balances: { cash: 1000, other: 0 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		flows: [salary, gated],
		start: "2026-01-01",
		horizon: "2026-12-31",
	}
}

describe("a fee marker is no evaluation date for a Milestone (ADR 0012, 0028)", () => {
	it("fires on the Flow's date, 1 Apr, with a fee that charges nothing, as with none", () => {
		const none = milestoned(setup([cash, { id: "other", kind: "asset", rate: 0 }]), [rich])
		const zero = milestoned(setup([cash, other(0)]), [rich])
		const empty = milestoned(setup([cash, other(1)]), [rich])
		for (const projection of [none, zero, empty]) {
			expect(firedOn(projection, "rich")).toBe("2026-04-01")
		}
	})

	it("lands a once Flow gated on it on 1 Apr, never on 31 Mar", () => {
		const cashOn = (projection: Projection, date: string) =>
			amounts(rowAt(projection, date))["cash"]
		const none = milestoned(setup([cash, { id: "other", kind: "asset", rate: 0 }]), [rich])
		const empty = milestoned(setup([cash, other(1)]), [rich])
		// 1,000 and three salaries by 31 Mar, no bonus yet; the fourth salary and the bonus of 1 land on 1 Apr.
		expect(cashOn(empty, "2026-03-31")).toBe(cashOn(none, "2026-03-31"))
		expect(cashOn(empty, "2026-03-31")).toBe(4000)
		expect(cashOn(empty, "2026-04-01")).toBe(cashOn(none, "2026-04-01"))
		expect(cashOn(empty, "2026-12-31")).toBe(cashOn(none, "2026-12-31"))
	})
})
