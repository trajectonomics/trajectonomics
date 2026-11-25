import { describe, expect, test } from "bun:test"
import { failedRead, netWorth, okRead, row } from "../overview/fixtures.test-support"
import { historyCut, historyLine, monthEndRows } from "./history"

const argv = (asOf: string) => ["report", "networth", "--as-of", asOf, "--json"]
const total = (amount: string) => [{ currency: "THB", amount }]

describe("monthEndRows", () => {
	test("keeps a failed month as a row with its date and the CLI's code, and no total", () => {
		const rows = monthEndRows([
			okRead(
				argv("2026-09-30"),
				netWorth("2026-09-30", [row("Bank", "asset", "1.00")], total("1.00")),
			),
			failedRead(argv("2026-10-31")),
		])
		expect(rows[0]).toEqual({
			index: 0,
			asOf: "30 Sep 2026",
			totals: total("1.00"),
			code: null,
			unstated: false,
		})
		expect(rows[1]).toEqual({
			index: 1,
			asOf: "31 Oct 2026",
			totals: null,
			code: "LEDGER_EMPTY",
			unstated: false,
		})
	})

	test("keeps a month whose total is not stated as a row with no total, and says it was read", () => {
		const rows = monthEndRows([
			okRead(argv("2026-09-30"), netWorth("2026-09-30", [row("Bank", "asset", "1.00")], null)),
		])
		expect(rows[0]).toEqual({
			index: 0,
			asOf: "30 Sep 2026",
			totals: null,
			code: "AMOUNT_OVERFLOW",
			unstated: true,
		})
	})

	test("is empty for an empty history", () => {
		expect(monthEndRows([])).toEqual([])
	})
})

describe("historyLine", () => {
	test("names the reads the history used and their range", () => {
		const line = historyLine([
			okRead(argv("2026-08-31"), netWorth("2026-08-31", [], total("1.00"))),
			okRead(argv("2026-09-30"), netWorth("2026-09-30", [], total("2.00"))),
		])
		expect(line).toBe("The history uses 2 month-end reads, from Aug 2026 to Sep 2026.")
	})

	test("counts a single read in the singular", () => {
		const line = historyLine([
			okRead(argv("2026-09-30"), netWorth("2026-09-30", [], total("2.00"))),
		])
		expect(line).toBe("The history uses 1 month-end read, from Sep 2026 to Sep 2026.")
	})

	test("says how many reads were left out when some failed", () => {
		const line = historyLine([
			okRead(argv("2026-08-31"), netWorth("2026-08-31", [], total("1.00"))),
			failedRead(argv("2026-09-30")),
			failedRead(argv("2026-10-31")),
		])
		expect(line).toContain("The history uses 1 month-end read")
		expect(line).toContain("2 could not be read and are left out.")
	})

	test("says so plainly when there is nothing to chart", () => {
		expect(historyLine([])).toBe("The history has no month-end read to chart.")
	})
})

describe("historyCut", () => {
	test("says so when the ledger's first entry is before the history's first month", () => {
		expect(historyCut(["2016-11-30", "2016-12-31"], "2012-03-15")).toBe(
			"The ledger's first entry is in Mar 2012, but the chart shows only the latest 2 month-ends, from Nov 2016. Earlier months are left out.",
		)
	})

	test("is silent when the history starts in the month of the first entry", () => {
		expect(historyCut(["2016-11-30", "2016-12-31"], "2016-11-01")).toBeNull()
		expect(historyCut(["2016-11-30"], "2016-11-30")).toBeNull()
	})

	test("is silent for an empty history or a ledger with no first entry", () => {
		expect(historyCut([], "2012-03-15")).toBeNull()
		expect(historyCut(["2016-11-30"], null)).toBeNull()
	})
})
