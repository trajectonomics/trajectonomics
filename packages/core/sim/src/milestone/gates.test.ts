import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import { amounts, rowAt } from "../engine/test-rows"
import type { Milestone, Projection } from "../types"
import { milestoned } from "./test-milestones"

const cash = { id: "cash", kind: "asset", rate: 0 } as const
const base = {
	accounts: [cash],
	balances: { cash: 1000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-31",
} as const satisfies Setup

const retire: Milestone = {
	id: "retire",
	combine: "all",
	criteria: [{ id: "c", kind: "date", on: "2026-06-01" }],
}
/** Fires on 1 Apr 2026: opening net worth first reaches 3,500 with a 1,000 monthly salary. */
const rich: Milestone = {
	id: "rich",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: 3500, terms: "nominal" },
	],
}

const salary = income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })

function cashOn(projection: Projection, date: string): number {
	return amounts(rowAt(projection, date))["cash"]!
}

describe("a Flow gated by startAt or endAt lands only inside its window", () => {
	it("stops a salary at its endAt: no landing on the date the Milestone fires", () => {
		// Salary on 1 Jan to 1 May: five landings. The 1 Jun landing is blocked, since the gate is
		// strictly before the fire date.
		const projection = milestoned({ ...base, flows: [{ ...salary, endAt: "retire" }] }, [retire])
		expect(cashOn(projection, "2026-05-01")).toBe(6000)
		expect(cashOn(projection, "2026-12-31")).toBe(6000)
	})

	it("starts a salary at its startAt: landings on and after the fire date only", () => {
		// Seven landings from 1 Jun to 1 Dec, starting with the fire date itself.
		const projection = milestoned({ ...base, flows: [{ ...salary, startAt: "retire" }] }, [retire])
		expect(cashOn(projection, "2026-05-01")).toBe(1000)
		expect(cashOn(projection, "2026-12-31")).toBe(8000)
	})

	it("gates a Flow on a dynamic Milestone, so the endAt cut lands on the same evaluation date", () => {
		// The 1 Apr salary is blocked by endAt 'rich', which fires on that same 1 Apr. Three landings
		// (Jan, Feb, Mar) make cash 4,000 at the horizon.
		const projection = milestoned({ ...base, flows: [{ ...salary, endAt: "rich" }] }, [rich])
		expect(projection.milestones).toEqual([{ id: "rich", reached: true, date: "2026-04-01" }])
		expect(cashOn(projection, "2026-12-31")).toBe(4000)
	})

	it("drops an expense gated by an endAt that never fires: it runs to the horizon", () => {
		const projection = milestoned(
			{
				...base,
				flows: [expense("rent", 50, { frequency: "monthly", start: "2026-01-01", endAt: "rich" })],
			},
			[
				{
					...rich,
					criteria: [
						{
							id: "c",
							kind: "metric",
							metric: "netWorth",
							op: "atLeast",
							amount: 1e12,
							terms: "nominal",
						},
					],
				},
			],
		)
		// Twelve rent payments of 50 land (the 'rich' gate never closes), leaving 400 of 1,000.
		expect(cashOn(projection, "2026-12-31")).toBe(400)
	})
})

describe("a once Flow with a startAt waits for its Milestone", () => {
	it("lands on a dynamic fire date when its own start came first", () => {
		// The bonus starts 1 Jan but lands on 1 Apr, when 'rich' fires and the gate opens. Before that,
		// the opening 1,000 and the Jan, Feb and Mar salaries make 4,000.
		const bonus = {
			...income("bonus", 5000, { frequency: "once", start: "2026-01-01", startAt: "rich" }),
			earned: false,
		}
		const projection = milestoned({ ...base, resolution: "day", flows: [salary, bonus] }, [rich])
		expect(cashOn(projection, "2026-03-31")).toBe(4000)
		expect(cashOn(projection, "2026-04-01")).toBe(10000)
	})

	it("lands on its own start when the Milestone had already fired", () => {
		// 'rich' fires 1 Apr; the bonus starts 15 May, after that, so it lands on its start.
		const bonus = {
			...income("bonus", 5000, { frequency: "once", start: "2026-05-15", startAt: "rich" }),
			earned: false,
		}
		const projection = milestoned({ ...base, resolution: "day", flows: [salary, bonus] }, [rich])
		expect(cashOn(projection, "2026-05-14")).toBe(6000)
		expect(cashOn(projection, "2026-05-15")).toBe(11000)
	})

	it("lands on a static fire date that falls after its own start", () => {
		// 'retire' fires 1 Jun; a bonus that starts 10 Jan is moved to 1 Jun, not 10 Jan.
		const bonus = {
			...income("bonus", 5000, { frequency: "once", start: "2026-01-10", startAt: "retire" }),
			earned: false,
		}
		const projection = milestoned({ ...base, resolution: "day", flows: [bonus] }, [retire])
		expect(cashOn(projection, "2026-05-31")).toBe(1000)
		expect(cashOn(projection, "2026-06-01")).toBe(6000)
	})

	it("never lands when its Milestone never fires", () => {
		const bonus = {
			...income("bonus", 5000, { frequency: "once", start: "2026-01-10", startAt: "rich" }),
			earned: false,
		}
		const projection = milestoned({ ...base, flows: [bonus] }, [
			{
				...rich,
				criteria: [
					{
						id: "c",
						kind: "metric",
						metric: "netWorth",
						op: "atLeast",
						amount: 1e12,
						terms: "nominal",
					},
				],
			},
		])
		expect(cashOn(projection, "2026-12-31")).toBe(1000)
	})
})
