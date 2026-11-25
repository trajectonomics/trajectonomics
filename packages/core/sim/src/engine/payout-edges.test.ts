import { describe, expect, it } from "bun:test"
import type { Milestone } from "../types"
import { project } from "./project"
import { amounts, makeFixture, rowAt } from "./test-helpers"
import { fund, payingSetup, projected, risesOf } from "./test-payout"

const retire: Milestone = {
	id: "retire",
	combine: "all",
	criteria: [{ id: "on", kind: "date", on: "2026-07-01" }],
}

describe("a payout of 0 bps", () => {
	it("gives a Projection byte for byte equal to the Account without a payout", () => {
		const options = { cashflowBreakdown: true }
		const plain = projected(payingSetup([{ id: "fund", kind: "asset", rate: 800 }]), options)
		const zero = projected(payingSetup([fund({ bps: 0 }, { rate: 800 })]), options)
		expect(JSON.stringify(zero)).toBe(JSON.stringify(plain))
	})
})

describe("the window of a payout", () => {
	const paid = (payout: Parameters<typeof fund>[0]): number =>
		amounts(
			rowAt(projected(payingSetup([fund(payout)]), {}, { milestones: [retire] }), "2026-12-31"),
		)["cash"]!

	it("pays from a Milestone's fire date: only 30 Sep and 31 Dec, 10,000,000 + 9,900,000", () => {
		expect(paid({ startAt: "retire" })).toBe(19_900_000)
	})

	it("stops strictly before a Milestone's fire date: 31 Mar and 30 Jun only, 10,000,000 + 9,900,000", () => {
		expect(paid({ endAt: "retire" })).toBe(19_900_000)
	})

	it("starts on the first period end on or after `start` and ends on one on or before `end`", () => {
		expect(paid({ start: "2026-04-01", end: "2026-09-30" })).toBe(19_900_000)
		expect(paid({ start: "2026-03-31", end: "2026-03-31" })).toBe(10_000_000)
		expect(paid({ start: "2026-04-01", end: "2026-06-29" })).toBe(0)
	})
})

describe("the dates of a payout", () => {
	const monthly = (setup: Partial<Parameters<typeof payingSetup>[1]>) =>
		risesOf(projected(payingSetup([fund({ bps: 1200, frequency: "monthly" })], setup)), "cash")

	it("falls on the last day of each calendar month, leap day included, whatever the Timeline start", () => {
		expect(monthly({ start: "2028-01-10", horizon: "2028-04-30" })).toEqual([
			"2028-01-31",
			"2028-02-29",
			"2028-03-31",
			"2028-04-30",
		])
	})

	it("lands on the Business day after a closed Due date, like any Occurrence", () => {
		// 31 Jan and 28 Feb 2026 are Saturdays: those payouts land on Monday 2 Feb and Monday 2 Mar.
		const calendar = { dayRule: "next", holidays: [] } as const
		const projection = projected(
			payingSetup([fund({ bps: 1200, frequency: "monthly" })], { horizon: "2026-03-31" }),
			{},
			{ calendar },
		)
		expect(risesOf(projection, "cash")).toEqual(["2026-02-02", "2026-03-02", "2026-03-31"])
	})
})

describe("a locked Account and Cost basis", () => {
	it("pays out of a locked Account, since a locked fund's dividends are paid to the holder", () => {
		const locked = projected(payingSetup([fund({}, { lockedUntil: "2030-01-01" })]))
		expect(amounts(rowAt(locked, "2026-03-31"))).toEqual({ cash: 10_000_000, fund: 990_000_000 })
	})
})

describe("a payout beside a sale on its date", () => {
	it("leaves the Account first, so the sale can only sell what is left", () => {
		const { baseline, scenario, timeline } = makeFixture(
			payingSetup([fund()], { horizon: "2026-03-31" }),
		)
		const sale = {
			id: "sale",
			kind: "withdrawal",
			source: "fund",
			frequency: "once",
			start: "2026-03-31",
			amount: 2_000_000_000,
			growth: { bps: 0 },
		} as const
		const result = project(baseline, { ...scenario, flows: [sale] }, timeline)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		// The payout reads 1,000,000,000 and leaves 990,000,000, which the sale takes whole: cash is both.
		expect(amounts(rowAt(result.projection, "2026-03-31"))).toEqual({
			cash: 1_000_000_000,
			fund: 0,
		})
	})
})
