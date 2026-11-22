import { describe, expect, it } from "bun:test"
import { income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import { amounts, rowAt } from "../engine/test-rows"
import type { Milestone } from "../types"
import { milestoned } from "./test-milestones"

const cash = { id: "cash", kind: "asset", rate: 0 } as const
const base = {
	accounts: [cash],
	balances: { cash: 1000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-01",
	resolution: "month",
} as const satisfies Setup

const salary = income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })

/** Net worth first reaches 3,500 on 1 Apr 2026: 1,000 opening, then 1,000 more on each of 1 Jan, Feb, Mar. */
const late: Milestone = {
	id: "late",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: 3500, terms: "nominal" },
	],
}

/** Dated 1 Mar 2026, before `late` fires. */
const early: Milestone = {
	id: "early",
	combine: "all",
	criteria: [{ id: "c", kind: "date", on: "2026-03-01" }],
}

/** Dated 1 Jun 2026, a static fire date. */
const june: Milestone = {
	id: "june",
	combine: "all",
	criteria: [{ id: "c", kind: "date", on: "2026-06-01" }],
}

/** Dated 1 Sep 2026, after `june`. */
const september: Milestone = {
	id: "september",
	combine: "all",
	criteria: [{ id: "c", kind: "date", on: "2026-09-01" }],
}

const bonusFrom = (startAt: string, endAt: string) => ({
	...income("bonus", 500, { frequency: "once", start: "2026-01-10", startAt, endAt }),
	earned: false,
})

describe("a deferred once Flow also honours its endAt when its startAt fires", () => {
	it("never lands when endAt fires before the dynamic startAt does", () => {
		// The bonus's startAt fires 1 Apr; endAt fired 1 Mar, so the bonus is gated out on 1 Apr.
		// Salary lands 12 times (Jan to Dec), so end cash = 1,000 + 12 × 1,000 = 13,000, not 13,500.
		const projection = milestoned({ ...base, flows: [salary, bonusFrom("late", "early")] }, [
			late,
			early,
		])
		expect(projection.rows.at(-1)!.date).toBe("2026-12-01")
		expect(amounts(rowAt(projection, "2026-12-01"))["cash"]).toBe(13000)
	})
})

describe("a once Flow with both startAt and endAt static", () => {
	it("lands on its static startAt fire date when endAt fires after it", () => {
		// Start 10 Jan is moved to the fire date 1 Jun; endAt fires 1 Sep, after it: lands once.
		// Opening cash 1,000 stays until the bonus lands on 1 Jun: 1,000 + 500 = 1,500.
		const projection = milestoned({ ...base, flows: [bonusFrom("june", "september")] }, [
			june,
			september,
		])
		expect(amounts(rowAt(projection, "2026-05-01"))["cash"]).toBe(1000)
		expect(amounts(rowAt(projection, "2026-06-01"))["cash"]).toBe(1500)
		expect(amounts(rowAt(projection, "2026-12-01"))["cash"]).toBe(1500)
	})

	it("never lands when endAt fires before the startAt fire date", () => {
		// startAt fires 1 Jun, endAt fired 1 Mar: the Flow is gated out on 1 Jun and never lands.
		const projection = milestoned({ ...base, flows: [bonusFrom("june", "early")] }, [june, early])
		expect(amounts(rowAt(projection, "2026-12-01"))["cash"]).toBe(1000)
	})
})
