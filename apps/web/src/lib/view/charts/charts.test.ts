import { describe, expect, test } from "bun:test"
import { buildCatalogue } from "./catalogue"
import { defaultName, duplicateOf, mergeCharts, saveChart, uniqueId } from "./edit"
import { plain, withTax } from "./fixtures.test-support"
import { resolveSeries } from "./resolve"
import { parseCharts, readCharts, serializeCharts } from "./stored"
import type { ChartDef } from "./types"
import { chartView } from "./view"

const NAMES = new Map([["savings", "Savings"]])
const CHART: ChartDef = {
	id: "spend",
	name: "Spend",
	kind: "stacked-bars",
	series: ["income", "expenses", "tax:th-pit:due"],
}

function byId(run = withTax()) {
	return new Map(resolveSeries(run, NAMES).map((item) => [item.id, item]))
}

describe("the series catalogue", () => {
	test("lists the CLI's yearly figures by group, with each Account named", () => {
		const ids = [...byId().keys()]
		expect(ids).toEqual(
			expect.arrayContaining([
				"net-worth",
				"income",
				"expenses",
				"account:savings",
				"tax:th-pit:due",
				"tax:th-pit:taxable",
			]),
		)
		expect(byId().get("account:savings")?.name).toBe("Value of Savings")
		expect(byId().get("net-worth")?.real?.[0]?.amount).toBe("1200000.00")
		expect(byId().get("income")?.real).toBeNull()
	})

	test("keeps the CLI's strings and places a point at the year its period ends in", () => {
		const due = byId().get("tax:th-pit:due")
		expect(due?.nominal.map((point) => [point.x, point.amount])).toEqual([
			[2026, "9000.00"],
			[2027, "9500.00"],
		])
	})

	test("greys out what the selected plan lacks, with the reason", () => {
		const groups = buildCatalogue([withTax(), plain()], plain(), NAMES)
		const tax = groups.find((group) => group.id === "tax")
		expect(
			tax?.entries.every((entry) => !entry.available && entry.reason === "this plan has no tax"),
		).toBe(true)
		expect(tax?.notes).toEqual(["This plan has no tax."])
		const money = groups.find((group) => group.id === "money")?.entries
		expect(money?.find((entry) => entry.id === "income")?.available).toBe(true)
		expect(money?.find((entry) => entry.id === "withdrawals")?.reason).toBe(
			"this plan has no withdrawal Flow",
		)
	})
})

describe("a chart on a plan", () => {
	test("draws what the plan states, and names what it lacks", () => {
		const view = chartView(
			CHART,
			byId(plain()),
			new Map([["tax:th-pit:due", "Tax due, th-pit"]]),
			"nominal",
		)
		expect(view.series.map((line) => line.name)).toEqual(["Income", "Expenses"])
		expect(view.missing).toEqual([
			{ id: "tax:th-pit:due", name: "Tax due, th-pit", reason: "this plan has no tax" },
		])
	})

	test("the table holds the CLI's strings, a row per year", () => {
		const view = chartView(CHART, byId(), new Map(), "nominal")
		expect(view.table.headers).toEqual(["Income", "Expenses", "Tax due, th-pit"])
		expect(view.table.rows.map((row) => row.label)).toEqual(["2026", "2027", "2028", "2028-12"])
		expect(view.table.rows[1]).toEqual({
			label: "2027",
			cells: ["120000.00", "60000.00", "9500.00"],
		})
		expect(view.table.rows[3]?.cells).toEqual(["120000.00", "60000.00", null])
	})

	test("follows the terms only for a series with a real figure, and labels the others nominal", () => {
		const chart: ChartDef = { id: "a", name: "A", kind: "line", series: ["net-worth", "income"] }
		const real = chartView(chart, byId(), new Map(), "real")
		expect(real.series.map((line) => line.name)).toEqual([
			"Net worth at the close of the year, in As-of terms",
			"Income (nominal)",
		])
		const both = chartView(chart, byId(), new Map(), "both")
		expect(both.series.map((line) => line.name)).toHaveLength(3)
		expect(real.notes).toHaveLength(1)
	})

	test("a stacked chart draws one set of terms, nominal for both", () => {
		const view = chartView({ ...CHART, series: ["net-worth"] }, byId(), new Map(), "both")
		expect(view.series).toHaveLength(1)
		expect(view.notes).toContain("A stacked chart draws one set of terms, so it is nominal.")
	})

	test("shows each figure as the CLI's string with its sign", () => {
		const view = chartView(
			{ ...CHART, kind: "line", series: ["income"] },
			byId(),
			new Map(),
			"nominal",
		)
		expect(view.series[0]?.points[0]?.display).toBe("120,000.00")
	})
})

describe("storage", () => {
	test("a chart round trips through its text", () => {
		const parsed = parseCharts(serializeCharts([CHART]))
		expect(parsed).toEqual({ ok: true, charts: [CHART] })
		expect(readCharts(serializeCharts([CHART]))).toEqual({ charts: [CHART], problem: null })
	})

	test("nothing stored is no charts, and unreadable text is no charts with a reason", () => {
		expect(readCharts(null)).toEqual({ charts: [], problem: null })
		expect(readCharts("{").problem).toContain("could not be read")
	})

	test("a bad file is refused whole, naming why", () => {
		for (const text of [
			"not json",
			"[]",
			JSON.stringify({ format: "other", version: 1, charts: [] }),
			JSON.stringify({
				format: "trajectonomics-charts",
				version: 1,
				charts: [{ id: "x", name: "X", kind: "pie", series: ["income"] }],
			}),
			JSON.stringify({
				format: "trajectonomics-charts",
				version: 1,
				charts: [{ id: "x", name: "X", kind: "line", series: [] }],
			}),
			JSON.stringify({
				format: "trajectonomics-charts",
				version: 1,
				charts: [{ id: "x", name: "X", kind: "line", series: ["a", "a"] }],
			}),
		]) {
			const parsed = parseCharts(text)
			expect(parsed.ok).toBe(false)
		}
		const newer = parseCharts(
			JSON.stringify({ format: "trajectonomics-charts", version: 2, charts: [] }),
		)
		expect(newer).toEqual({
			ok: false,
			reason: "This chart file is version 2; this page reads version 1.",
		})
	})

	test("an import gets ids not yet used and is refused when it would not fit", () => {
		const merged = mergeCharts([CHART], [CHART])
		expect(merged?.map((chart) => chart.id)).toEqual(["spend", "spend-2"])
		const full = Array.from({ length: 50 }, (_, index) => ({ ...CHART, id: `c${index}` }))
		expect(mergeCharts(full, [CHART])).toBeNull()
		expect(saveChart(full, CHART)).toBeNull()
	})

	test("edits: a unique id, a copy and a default name", () => {
		expect(uniqueId("My chart!", new Set(["my-chart"]))).toBe("my-chart-2")
		expect(duplicateOf([CHART], CHART)).toMatchObject({ id: "spend-2", name: "Spend (copy)" })
		expect(defaultName(["Income", "Expenses"])).toBe("Income and 1 more")
	})
})
