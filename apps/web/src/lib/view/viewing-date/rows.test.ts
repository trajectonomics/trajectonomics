import { describe, expect, test } from "bun:test"
import type { NetWorth, Snapshot } from "../../contract"
import { failedRead } from "../../snapshot/fixtures.test-support"
import { DEMO } from "../what-if/fixtures.test-support"
import { netWorthAt, periodFor, ruleYearFor } from "./rows"
import { monthly, monthlyRun, netWorthRead } from "./rows.test-support"

/** The Demo's parameters with another As-of, and the history and monthly Reads as they are. */
function demoAsOf(asOf: string): Snapshot {
	return { ...DEMO, params: { ...DEMO.params, asOf } }
}

/** The Demo with the monthly Reads replaced, so a row can be chosen by hand. */
function demoMonthly(reads: Snapshot["reads"]["monthly"]): Snapshot {
	return { ...DEMO, reads: { ...DEMO.reads, monthly: reads } }
}

/** The index of the history Read at a month-end. */
function historyIndex(date: string): number {
	return DEMO.params.historyDates.indexOf(date)
}

/** The Demo with one history Read replaced. */
function demoHistory(index: number, read: Snapshot["reads"]["netWorthHistory"][number]): Snapshot {
	const history = DEMO.reads.netWorthHistory.map((one, at) => (at === index ? read : one))
	return { ...DEMO, reads: { ...DEMO.reads, netWorthHistory: history } }
}

describe("net worth at a viewing month", () => {
	test("on the Demo a past month is its history Read, the As-of month is today, and a later month is the monthly row", () => {
		const past = netWorthAt(DEMO, "base", "2025-03")
		if (past.kind !== "past") throw new Error(`2025-03 is ${past.kind}`)
		expect(past.read.argv).toEqual(["report", "networth", "--as-of", "2025-03-31", "--json"])
		expect(past.read.ok && past.read.data.asOf).toBe("2025-03-31")
		expect(netWorthAt(DEMO, "base", "2026-10")).toEqual({
			kind: "today",
			read: DEMO.reads.netWorth,
		})
		const future = netWorthAt(DEMO, "base", "2027-01")
		if (future.kind !== "future") throw new Error(`2027-01 is ${future.kind}`)
		expect(future.row.date).toBe("2027-01-31")
	})

	test("a mid-month As-of reads the last month-end from the history and its own month as today", () => {
		const snapshot = demoAsOf("2026-11-28")
		const past = netWorthAt(snapshot, "base", "2026-10")
		if (past.kind !== "past") throw new Error(`2026-10 is ${past.kind}`)
		expect(past.read.argv).toContain("2026-10-31")
		expect(netWorthAt(snapshot, "base", "2026-11").kind).toBe("today")
	})

	test("the last row of a month wins, where a run-out date falls in the month the horizon's row is in", () => {
		const november = monthly("2053-11-28", "1.00")
		const december = monthly("2053-12-31", "3.00")
		const rows = [november, monthly("2053-12-28", "2.00"), december]
		const snapshot = demoMonthly({ base: { argv: [], ok: true, data: monthlyRun(rows) } })
		expect(netWorthAt(snapshot, "base", "2053-12")).toEqual({ kind: "future", row: december })
		expect(netWorthAt(snapshot, "base", "2053-11")).toEqual({ kind: "future", row: november })
	})

	test("a plan that runs out holds its run-out row in that month and says so after it", () => {
		const february = netWorthAt(DEMO, "retire-early", "2053-02")
		if (february.kind !== "future") throw new Error(`2053-02 is ${february.kind}`)
		expect(february.row.date).toBe("2053-02-01")
		for (const month of ["2053-03", "2053-12"]) {
			expect(netWorthAt(DEMO, "retire-early", month)).toEqual({
				kind: "ranOut",
				date: "2053-02-01",
			})
		}
	})

	test("a failed history Read, a Read with no totals and a plan with no monthly Read are missing", () => {
		const march = historyIndex("2025-03-31")
		const failed = demoHistory(
			march,
			failedRead<NetWorth>(DEMO.reads.netWorthHistory[march]?.argv ?? []),
		)
		expect(netWorthAt(failed, "base", "2025-03")).toEqual({ kind: "missing" })

		const noTotals = demoHistory(march, netWorthRead("2025-03-31", null))
		expect(netWorthAt(noTotals, "base", "2025-03")).toEqual({ kind: "missing" })

		expect(netWorthAt(demoMonthly({}), "base", "2027-01")).toEqual({ kind: "missing" })
	})

	test("a future month with no row and no run-out is missing, and so is one with no monthly row at all", () => {
		const gap = monthlyRun([monthly("2027-01-31", "1.00")])
		const snapshot = demoMonthly({ base: { argv: [], ok: true, data: gap } })
		expect(netWorthAt(snapshot, "base", "2027-02")).toEqual({ kind: "missing" })
	})
})

describe("the period a month falls in", () => {
	const FIRST = { from: "2026-10-31", to: "2027-10-30" }
	const SECOND = { from: "2027-10-31", to: "2028-10-30" }
	const ROLLUPS = [FIRST, SECOND]

	test("puts 2027-10 in the second roll-up, 2026-10 in the first and 2025-03 before the first", () => {
		expect(periodFor(ROLLUPS, "2027-10", null)).toEqual({ period: SECOND, side: "in" })
		expect(periodFor(ROLLUPS, "2026-10", null)).toEqual({ period: FIRST, side: "in" })
		expect(periodFor(ROLLUPS, "2025-03", null)).toEqual({ period: FIRST, side: "before" })
	})

	test("puts retire-early's last month in the roll-up that ends on the run-out date, and the month after it ranOut", () => {
		const earlier = { from: "2051-10-31", to: "2052-10-30" }
		const last = { from: "2052-10-31", to: "2053-02-01" }
		expect(periodFor([earlier, last], "2053-02", "2053-02-01")).toEqual({
			period: last,
			side: "in",
		})
		expect(periodFor([earlier, last], "2053-03", "2053-02-01")).toEqual({
			period: last,
			side: "ranOut",
		})
	})

	test("puts a calendar tax year's own months in it and an earlier month before it", () => {
		const first = { from: "2026-01-01", to: "2026-12-31" }
		const second = { from: "2027-01-01", to: "2027-12-31" }
		expect(periodFor([first, second], "2026-03", null)).toEqual({ period: first, side: "in" })
		expect(periodFor([first, second], "2025-12", null)).toEqual({ period: first, side: "before" })
	})

	test("a month after the last period is after it when the plan does not run out, and an empty list has no period", () => {
		expect(periodFor(ROLLUPS, "2028-11", null)).toEqual({ period: SECOND, side: "after" })
		expect(periodFor([], "2026-10", null)).toBeNull()
	})
})

describe("the Rule year a month falls in", () => {
	const FIRST = { date: "2050-06-01" }
	const SECOND = { date: "2051-06-01" }
	const THIRD = { date: "2052-06-01" }
	const LAST = { date: "2053-06-01" }
	const ROWS = [FIRST, SECOND, THIRD, LAST]

	test("on base, 2026-10 is before the first Rule year, 2050-06 is in the first and 2053-12 in the last", () => {
		expect(ruleYearFor(ROWS, "2026-10", "2053-12-31", null)).toEqual({
			period: FIRST,
			side: "before",
		})
		expect(ruleYearFor(ROWS, "2050-06", "2053-12-31", null)).toEqual({
			period: FIRST,
			side: "in",
		})
		expect(ruleYearFor(ROWS, "2053-12", "2053-12-31", null)).toEqual({
			period: LAST,
			side: "in",
		})
	})

	test("a month after the plan ended is ranOut when it ran out, after as the guard when it did not", () => {
		expect(ruleYearFor([FIRST, SECOND, THIRD], "2053-03", "2053-02-01", "2053-02-01")).toEqual({
			period: THIRD,
			side: "ranOut",
		})
		expect(ruleYearFor(ROWS, "2054-01", "2053-12-31", null)).toEqual({
			period: LAST,
			side: "after",
		})
	})

	test("an empty list has no Rule year", () => {
		expect(ruleYearFor([], "2026-10", "2053-12-31", null)).toBeNull()
	})
})
