import { describe, expect, test } from "bun:test"
import { netWorthFocusView } from "./focus"
import type { HistoryView } from "./page"
import type { NetWorthView } from "./view"

const VIEW: NetWorthView = {
	asOf: "31 Oct 2026",
	totals: [{ currency: "THB", amount: "1214900.00" }],
	note: null,
	bars: [],
	liabilities: [],
	rows: [],
}

const HISTORY: HistoryView = {
	series: {
		name: "Net worth",
		points: [
			{ x: 0, xLabel: "Sep 2026", y: 100, display: "100.00" },
			{ x: 1, xLabel: "Oct 2026", y: 200, display: "200.00" },
		],
	},
	rows: [],
	line: "The history uses 2 month-end reads, from Sep 2026 to Oct 2026.",
	cut: null,
}

describe("netWorthFocusView", () => {
	test("states the total and its As-of, and places the history's own numbers", () => {
		const view = netWorthFocusView(VIEW, HISTORY, false)
		expect(view?.label).toBe("What are you worth today? 1.21M THB as of 31 Oct 2026.")
		expect(view?.total).toBe("1214900.00")
		expect(view?.currency).toBe("THB")
		expect(view?.values).toEqual([100, 200])
	})

	test("says the amount is hidden with Hide amounts on, rather than stating it", () => {
		const view = netWorthFocusView(VIEW, HISTORY, true)
		expect(view?.label).toBe("What are you worth today? The amount is hidden. As of 31 Oct 2026.")
	})

	test("has no answer when the CLI states no total", () => {
		expect(netWorthFocusView({ ...VIEW, totals: [] }, HISTORY, false)).toBeNull()
	})
})
