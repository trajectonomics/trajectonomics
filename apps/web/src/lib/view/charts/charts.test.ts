import { describe, expect, test } from "bun:test"
import { type ItemNames, itemNames } from "../item-names"
import { buildCatalogue, defaultNameIndex } from "./catalogue"
import { defaultName, duplicateOf, mergeCharts, saveChart, savedName, uniqueId } from "./edit"
import { plain, withTax } from "./fixtures.test-support"
import { planNames, withExpenseFlows } from "./flow-fixtures.test-support"
import { resolveSeries } from "./resolve"
import { parseCharts, readCharts, serializeCharts } from "./stored"
import type { ChartDef } from "./types"
import { periodText } from "./year"

const NAMES = new Map([["savings", "Savings"]])
const NO_NAMES = itemNames(NAMES, null)

const CHART: ChartDef = {
	id: "spend",
	name: "Spend",
	kind: "stacked-bars",
	series: ["income", "expenses", "tax:th-pit:due"],
}

function byId(run = withTax()) {
	return new Map(resolveSeries(run, NO_NAMES).map((item) => [item.id, item]))
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

	test("names a cash-flow series by the plan's label, the id when it states none, and twins with the id", () => {
		const series = (names: ItemNames) =>
			resolveSeries(withTax(), names).find((item) => item.id.startsWith("cash:"))?.name
		expect(series(NO_NAMES)).toBe("Income: salary")
		expect(series(planNames([{ id: "salary", displayLabel: "Salary" }]))).toBe("Income: Salary")
		expect(series(planNames([{ id: "salary" }]))).toBe("Income: salary")
		expect(
			series(
				planNames([
					{ id: "salary", displayLabel: "Salary" },
					{ id: "bonus", displayLabel: "Salary" },
				]),
			),
		).toBe("Income: Salary (salary)")
	})

	test("adds the id when a label reads the same as an id, so the series can be told apart", () => {
		const run = withExpenseFlows(["a", "rent"])
		const names = planNames([{ id: "a", displayLabel: "rent" }, { id: "rent" }])
		const namesOfRun = resolveSeries(run, names)
			.filter((item) => item.id.startsWith("cash:"))
			.map((item) => item.name)
		expect(namesOfRun).toEqual(["Expense: rent (a)", "Expense: rent (rent)"])
	})

	test("adds the id when a label equals another Flow's twin form", () => {
		const run = withExpenseFlows(["a", "b", "rent"])
		const names = planNames([
			{ id: "a", displayLabel: "rent" },
			{ id: "rent", displayLabel: "rent" },
			{ id: "b", displayLabel: "rent (a)" },
		])
		const namesOfRun = resolveSeries(run, names)
			.filter((item) => item.id.startsWith("cash:"))
			.map((item) => item.name)
		expect(namesOfRun).toEqual([
			"Expense: rent (a) (a)",
			"Expense: rent (a) (b)",
			"Expense: rent (rent)",
		])
	})

	test("keeps the CLI's strings and places a point at the day its period ends", () => {
		const due = byId().get("tax:th-pit:due")
		expect(due?.nominal.map((point) => [point.date, point.amount])).toEqual([
			["2026-12-31", "9000.00"],
			["2027-12-31", "9500.00"],
		])
		const income = byId().get("income")?.nominal
		expect(income?.map((point) => point.date)).toEqual(["2027-10-30", "2028-10-30", "2028-12-31"])
		const xs = income?.map((point) => point.x) ?? []
		expect(xs.every((x, index) => index === 0 || x > (xs[index - 1] ?? 0))).toBe(true)
	})

	test("names a period by the dates it covers, and a part year as such", () => {
		const income = byId().get("income")?.nominal ?? []
		expect(income.map((point) => periodText(point))).toEqual([
			"31 Oct 2026 – 30 Oct 2027",
			"31 Oct 2027 – 30 Oct 2028",
			"31 Oct – 31 Dec 2028, part year",
		])
		expect(
			byId()
				.get("tax:th-pit:due")
				?.nominal.map((point) => periodText(point)),
		).toEqual(["1 Jan 2026 – 31 Dec 2026", "1 Jan 2027 – 31 Dec 2027"])
	})

	test("greys out what the selected plan lacks, with the reason", () => {
		const groups = buildCatalogue([withTax(), plain()], plain(), NO_NAMES)
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
		const reshaped = parseCharts(
			JSON.stringify({ format: "trajectonomics-charts", version: 2, charts: [{ shape: "new" }] }),
		)
		expect(reshaped).toEqual(newer)
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

	test("a new chart's default name reads the series ids, so it fits every plan", () => {
		const run = withExpenseFlows(["salary"])
		const alpha = planNames([{ id: "salary", displayLabel: "Alpha job" }])
		const bravo = planNames([{ id: "salary", displayLabel: "Bravo job" }])
		const series = resolveSeries(run, alpha)
			.filter((item) => item.id.startsWith("cash:"))
			.map((item) => item.id)
		expect(series).toHaveLength(1)
		expect(savedName("", series, defaultNameIndex([run], alpha))).toBe("Expense: salary")
		expect(savedName("", series, defaultNameIndex([run], bravo))).toBe("Expense: salary")
		expect(savedName("  Mine  ", series, defaultNameIndex([run], alpha))).toBe("Mine")
	})
})
