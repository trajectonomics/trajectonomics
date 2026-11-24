import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { chartStore } from "../../client/charts.svelte"
import { preferences } from "../../client/preferences.svelte"
import { plain, withTax } from "../../lib/view/charts/fixtures.test-support"
import type { ChartDef } from "../../lib/view/charts/types"
import ProjectionCharts from "./ProjectionCharts.svelte"

const CHART: ChartDef = {
	id: "spend",
	name: "Income, expenses and tax",
	kind: "stacked-bars",
	series: ["income", "expenses", "tax:th-pit:due"],
}

function show(chart: string, run = withTax()): string {
	chartStore.charts = [CHART]
	return render(ProjectionCharts, {
		props: {
			run,
			terms: "both",
			onTerms: () => {},
			charts: {
				chart,
				onChart: () => {},
				runs: [withTax(), plain()],
				accountNames: new Map([["savings", "Savings"]]),
			},
		},
	}).body
}

const SAVED_HIDDEN = preferences.hidden
afterAll(() => {
	preferences.hidden = SAVED_HIDDEN
})

describe("the Projection's charts", () => {
	test("the title is a picker: the net worth chart, My charts, then New chart", () => {
		const body = show("")
		expect(body).toContain("Net worth by year")
		expect(body).toContain('label="My charts"')
		expect(body).toContain("Income, expenses and tax")
		expect(body).toContain("New chart…")
		expect(body).toContain('role="img"')
	})

	test("a chart of income, expenses and tax as stacked bars is drawn with a table of the CLI's figures", () => {
		const body = show("spend")
		expect(body).toContain("stacked bars, by year")
		expect(body).toContain("<rect")
		expect(body).toContain("Values of Income, expenses and tax, as a table")
		expect(body).toContain("120,000.00")
		expect(body).toContain("9,000.00")
		expect(body).toContain("stacked chart draws one set of terms")
	})

	test("on a plan without tax it draws what it can and says what is missing", () => {
		const body = show("spend", plain())
		expect(body).toContain("Not on this plan, so not drawn")
		expect(body).toContain("this plan has no tax")
		expect(body).toContain("<rect")
	})

	test("the chart's controls are reachable: edit, duplicate and delete, export and import", () => {
		const body = show("spend")
		for (const word of ["Edit", "Duplicate", "Delete", "Export my charts", "Import charts"]) {
			expect(body).toContain(word)
		}
	})

	test("hiding amounts masks the table and the axis, and every figure with it", () => {
		preferences.hidden = true
		const body = show("spend")
		preferences.hidden = SAVED_HIDDEN
		expect(body).not.toContain("120,000.00")
		expect(body).not.toContain("9,000.00")
		expect(body).toContain("amount hidden")
		expect(body).toContain("•")
	})
})
