import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import type { Milestone } from "../types"
import { firedOn, milestoned, milestonedResult } from "./test-milestones"

const cash = { id: "cash", kind: "asset", rate: 0 } as const
const base = {
	accounts: [cash],
	balances: { cash: 0 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	flows: [],
	start: "2026-01-01",
	horizon: "2029-01-01",
} as const satisfies Setup

const dated = (id: string, on: string): Milestone => ({
	id,
	combine: "all",
	criteria: [{ id: "c", kind: "date", on }],
})

describe("static Milestones fire on dates known before the run", () => {
	it("chains a Milestone 18 years after a date that falls before the Timeline start", () => {
		// The child is born 15 Mar 2010; 216 months later is 15 Mar 2028, inside the horizon.
		const projection = milestoned(base, [
			dated("born", "2010-03-15"),
			{
				id: "adult",
				combine: "all",
				criteria: [{ id: "c", kind: "milestone", milestone: "born", months: 216 }],
			},
		])
		expect(projection.milestones).toEqual([
			{ id: "born", reached: true, date: "2010-03-15" },
			{ id: "adult", reached: true, date: "2028-03-15" },
		])
	})

	it("takes the latest criterion date for 'all' and the earliest for 'any'", () => {
		const criteria = [
			{ id: "late", kind: "date", on: "2027-01-01" },
			{ id: "early", kind: "date", on: "2026-06-01" },
		] as const
		const projection = milestoned(base, [
			{ id: "all", combine: "all", criteria: [...criteria] },
			{ id: "any", combine: "any", criteria: [...criteria] },
		])
		expect(firedOn(projection, "all")).toBe("2027-01-01")
		expect(firedOn(projection, "any")).toBe("2026-06-01")
	})

	it("moves a fire date that falls on a holiday forward to the next Business day", () => {
		// 1 Aug 2026 is a Saturday; with the 'next' rule the Landed date is Monday 3 Aug.
		const projection = milestoned({ ...base, calendar: { dayRule: "next", holidays: [] } }, [
			dated("payday", "2026-08-01"),
		])
		expect(firedOn(projection, "payday")).toBe("2026-08-03")
	})

	it("steps a fire date back by a negative offset from a static Milestone", () => {
		const projection = milestoned(base, [
			dated("sale", "2026-06-01"),
			{
				id: "listed",
				combine: "all",
				criteria: [{ id: "c", kind: "milestone", milestone: "sale", months: -3 }],
			},
		])
		expect(firedOn(projection, "listed")).toBe("2026-03-01")
	})

	it("reports a static Milestone after the horizon as reached false", () => {
		const projection = milestoned(base, [dated("far", "2040-01-01")])
		expect(projection.milestones).toEqual([{ id: "far", reached: false }])
	})

	it("reports a static Milestone after a Runs-out as reached false, and one before it as reached", () => {
		// No money at all: the first expense on 1 Jan 2026 runs out, so the run ends that day.
		const setup = {
			...base,
			flows: [expense("rent", 1000, { frequency: "once", start: "2026-01-01" })],
		} as const
		const result = milestonedResult(setup, [
			dated("before", "2025-12-01"),
			dated("after", "2026-03-01"),
		])
		expect(result.ok && result.projection.milestones).toEqual([
			{ id: "before", reached: true, date: "2025-12-01" },
			{ id: "after", reached: false },
		])
	})
})
