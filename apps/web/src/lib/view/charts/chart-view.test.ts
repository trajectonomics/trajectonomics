import { describe, expect, test } from "bun:test"
import { plain, withTax } from "./fixtures.test-support"
import { reasonFor } from "./reasons"
import { resolveSeries } from "./resolve"
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

	test("the table holds the CLI's strings, a row per period end that names its period", () => {
		const view = chartView(CHART, byId(), new Map(), "nominal")
		expect(view.table.headers).toEqual(["Income", "Expenses", "Tax due, th-pit"])
		expect(view.table.rows.map((row) => row.label)).toEqual([
			"1 Jan 2026 – 31 Dec 2026",
			"31 Oct 2026 – 30 Oct 2027",
			"1 Jan 2027 – 31 Dec 2027",
			"31 Oct 2027 – 30 Oct 2028",
			"31 Oct – 31 Dec 2028, part year",
		])
		const income = view.table.rows.find((row) => row.label === "31 Oct 2027 – 30 Oct 2028")
		expect(income?.cells).toEqual(["120000.00", "60000.00", null])
		const tax = view.table.rows.find((row) => row.label === "1 Jan 2027 – 31 Dec 2027")
		expect(tax?.cells).toEqual([null, null, "9500.00"])
	})

	test("never stacks periods that differ in one column, and says so", () => {
		const view = chartView(CHART, byId(), new Map(), "nominal")
		const income = view.series[0]?.points.map((point) => point.x) ?? []
		const tax = view.series[2]?.points.map((point) => point.x) ?? []
		expect(income.some((x) => tax.includes(x))).toBe(false)
		expect(view.notes.join(" ")).toContain(
			"each sits in its own column: Income, Expenses end each 30 Oct; Tax due, th-pit ends each 31 Dec",
		)
		expect(view.notes).toContain("A faded column is a part year.")
		const stub = view.series[0]?.points[2]
		expect(stub?.partial).toBe(true)
		expect(stub?.xTitle).toBe("31 Oct – 31 Dec 2028, part year")
		expect(view.series[0]?.points[0]?.xLabel).toBe("30 Oct 2027")
	})

	test("a chart of one period has no such note, and a line chart needs none", () => {
		const one = chartView(
			{ ...CHART, series: ["income", "expenses"] },
			byId(),
			new Map(),
			"nominal",
		)
		expect(one.notes.join(" ")).not.toContain("different periods")
		expect(chartView({ ...CHART, kind: "line" }, byId(), new Map(), "nominal").notes).toEqual([])
	})

	test("a stacked chart draws real only when every series has a real figure", () => {
		const real = (series: string[]) => chartView({ ...CHART, series }, byId(), new Map(), "real")
		const allReal = real(["net-worth", "account:savings"])
		expect(allReal.series.map((line) => line.name)).toEqual([
			"Net worth at the close of the year, in As-of terms",
			"Value of Savings, in As-of terms",
		])
		expect(allReal.series[0]?.points[0]?.display).toBe("1,200,000.00")
		expect(allReal.notes.join(" ")).not.toContain("one set of terms")
		const mixed = real(["net-worth", "income"])
		expect(mixed.series.map((line) => line.name)).toEqual([
			"Net worth at the close of the year",
			"Income",
		])
		expect(mixed.series[0]?.points[0]?.display).toBe("1,250,000.00")
		expect(mixed.notes.join(" ")).toContain("a series here has no figure in today's money")
		const both = chartView(
			{ ...CHART, series: ["net-worth", "account:savings"] },
			byId(),
			new Map(),
			"both",
		)
		expect(both.series).toHaveLength(2)
	})

	test("a missing tax series names the Levy when the plan has another", () => {
		const other = withTax()
		const view = chartView(
			{ ...CHART, series: ["tax:th-cgt:due"] },
			byId(other),
			new Map([["tax:th-cgt:due", "Tax due, th-cgt"]]),
			"nominal",
		)
		expect(view.missing[0]?.reason).toBe("this plan has no tax for th-cgt")
		const none = chartView(
			{ ...CHART, series: ["tax:th-cgt:due"] },
			byId(plain()),
			new Map(),
			"nominal",
		)
		expect(none.missing[0]?.reason).toBe("this plan has no tax")
		expect(reasonFor("tax:th-cgt:due", new Set(["tax:th-pit:due"]))).toBe(
			"this plan has no tax for th-cgt",
		)
	})

	test("no two series of a many-series line chart share a colour and a dash", () => {
		const seven = [
			"net-worth",
			"income",
			"expenses",
			"contributions",
			"interest",
			"unfunded",
			"account:savings",
		]
		const real = ["net-worth", "account:savings", "income", "expenses"]
		for (const [ids, terms] of [
			[seven, "nominal"],
			[seven, "real"],
			[real, "both"],
		] as const) {
			const view = chartView({ ...CHART, kind: "line", series: [...ids] }, byId(), new Map(), terms)
			const looks = view.series.map(
				(line, index) => `${index % 4}/${line.dashed ?? false}/${line.dotted ?? false}`,
			)
			expect(looks.length).toBeGreaterThanOrEqual(6)
			expect(new Set(looks).size).toBe(looks.length)
		}
	})
})
