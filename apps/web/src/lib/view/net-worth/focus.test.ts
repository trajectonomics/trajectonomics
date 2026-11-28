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
	test("states the total and its As-of, and places each month-end with its own month", () => {
		const view = netWorthFocusView(VIEW, HISTORY, false)
		expect(view?.label).toBe("What are you worth today? 1.21M THB as of 31 Oct 2026.")
		expect(view?.total).toBe("1214900.00")
		expect(view?.currency).toBe("THB")
		expect(view?.asOf).toBe("31 Oct 2026")
		expect(view?.points).toEqual([
			{ x: 0, y: 100, label: "Sep 2026" },
			{ x: 1, y: 200, label: "Oct 2026" },
		])
		expect(view?.months).toBe(2)
	})

	test("keeps the history's own month count when the last month could not be read", () => {
		const rows: HistoryView["rows"] = [0, 1, 2, 3].map((index) => ({
			index,
			asOf: "",
			totals: null,
			code: null,
			unstated: false,
		}))
		const view = netWorthFocusView(VIEW, { ...HISTORY, rows }, false)
		expect(view?.months).toBe(4)
	})

	test("names every currency total in its heading, and leaves the others for below it", () => {
		const totals = [
			{ currency: "THB", amount: "1214900.00" },
			{ currency: "USD", amount: "33400.00" },
		]
		const view = netWorthFocusView({ ...VIEW, totals }, HISTORY, false)
		expect(view?.label).toBe("What are you worth today? 1.21M THB, 33.4k USD as of 31 Oct 2026.")
		expect(view?.others).toEqual([{ currency: "USD", amount: "33400.00" }])
	})

	test("says the amount is hidden with Hide amounts on, rather than stating it", () => {
		const view = netWorthFocusView(VIEW, HISTORY, true)
		expect(view?.label).toBe("What are you worth today? The amount is hidden. As of 31 Oct 2026.")
	})

	test("answers even with no month-end history, which is the page's mark without a line", () => {
		const empty: HistoryView = {
			...HISTORY,
			series: { name: "Net worth", points: [] },
			line: "The history has no month-end read to chart.",
		}
		const view = netWorthFocusView(VIEW, empty, false)
		expect(view?.points).toEqual([])
		expect(view?.months).toBe(1)
		expect(view?.label).toBe("What are you worth today? 1.21M THB as of 31 Oct 2026.")
	})

	test("has no answer when the CLI states no total", () => {
		expect(netWorthFocusView({ ...VIEW, totals: [] }, HISTORY, false)).toBeNull()
	})
})
