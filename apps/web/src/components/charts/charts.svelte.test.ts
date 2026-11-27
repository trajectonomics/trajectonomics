import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { chartStore } from "../../client/charts.svelte"
import { preferences } from "../../client/preferences.svelte"
import { plain, withTax } from "../../lib/view/charts/fixtures.test-support"
import { planNames, withExpenseFlows } from "../../lib/view/charts/flow-fixtures.test-support"
import { resolveSeries } from "../../lib/view/charts/resolve"
import type { ChartDef } from "../../lib/view/charts/types"
import { itemNames } from "../../lib/view/item-names"
import ProjectionCharts from "./ProjectionCharts.svelte"

const CHART: ChartDef = {
	id: "spend",
	name: "Income, expenses and tax",
	kind: "stacked-bars",
	series: ["income", "expenses", "tax:th-pit:due"],
}

const SAVED_NAMES = itemNames(new Map([["savings", "Savings"]]), null)

function show(
	chart: string,
	run = withTax(),
	made: ChartDef = CHART,
	terms = "both",
	names = SAVED_NAMES,
): string {
	chartStore.charts = [made]
	return render(ProjectionCharts, {
		props: {
			run,
			terms,
			onTerms: () => {},
			charts: {
				chart,
				onChart: () => {},
				runs: [run, plain()],
				names,
			},
		},
	}).body
}

const SAVED_HIDDEN = preferences.hidden
afterAll(() => {
	preferences.hidden = SAVED_HIDDEN
})

describe("the Projection's charts", () => {
	test("the picker is behind one Charts button, and the chart still draws", () => {
		const body = show("")
		expect(body).toContain("Net worth by year")
		expect(body).toContain('aria-label="Charts"')
		expect(body).toContain('aria-expanded="false"')
		expect(body).not.toContain("New chart…")
		expect(body).not.toContain("Import charts")
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

	test("two series whose labels read the same are told apart by their ids", () => {
		const run = withExpenseFlows(["a", "rent"])
		const names = planNames([{ id: "a", displayLabel: "rent" }, { id: "rent" }])
		const series = resolveSeries(run, names)
			.filter((item) => item.id.startsWith("cash:"))
			.map((item) => item.id)
		const body = show(
			"same",
			run,
			{ id: "same", name: "Same", kind: "line", series },
			"both",
			names,
		)
		expect(body).toContain("Expense: rent (a) (future money)")
		expect(body).toContain("Expense: rent (future money)")
		expect(body).not.toContain("Expense: rent (rent)")
	})

	test("on a plan without tax it draws what it can and says what is missing", () => {
		const body = show("spend", plain())
		expect(body).toContain("Not on this plan, so not drawn")
		expect(body).toContain("this plan has no tax")
		expect(body).toContain("<rect")
	})

	test("the chart's controls are reachable: the picker, edit, duplicate and delete", () => {
		const body = show("spend")
		for (const word of ["Charts", "Edit", "Duplicate", "Delete"]) {
			expect(body).toContain(word)
		}
		expect(body).toContain('aria-label="Charts"')
		expect(body).not.toContain("Import charts")
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

	test("a long chart name cannot widen the page: the heading wraps and stays in its box", () => {
		const body = show("spend", withTax(), { ...CHART, name: "N".repeat(60) })
		const heading = /<h2 class="([^"]*)">N{60}<\/h2>/.exec(body)?.[1] ?? ""
		expect(heading).toContain("min-w-0")
		expect(heading).toContain("max-w-full")
		expect(heading).toContain("break-words")
		// The name also appears in the table's summary, where a long unbroken word must wrap.
		expect(body).toMatch(/<summary class="[^"]*wrap-anywhere[^"]*">Values of N{60}/)
	})

	test("a line chart of seven series draws no two alike in colour and dash", () => {
		const series = [
			"net-worth",
			"income",
			"expenses",
			"contributions",
			"interest",
			"unfunded",
			"account:savings",
		]
		const body = show("spend", withTax(), { ...CHART, kind: "line", series }, "nominal")
		const swatches = [...body.matchAll(/<line [^>]*stroke-width="2"[^>]*>/g)].map((m) => m[0])
		const looks = swatches.map((tag) => {
			const colour = /class="(stroke-[a-z-]+)"/.exec(tag)?.[1]
			const dash = /stroke-dasharray="([^"]*)"/.exec(tag)?.[1] ?? "solid"
			return `${colour}/${dash}`
		})
		expect(looks).toHaveLength(7)
		expect(new Set(looks).size).toBe(7)
		expect(looks.some((look) => look.startsWith("stroke-ring"))).toBe(true)
	})

	test("the table names each period, and the notes say what the columns hold", () => {
		const body = show("spend")
		expect(body).toContain("31 Oct – 31 Dec 2028, part year")
		expect(body).toContain("1 Jan 2027 – 31 Dec 2027")
		expect(body).toContain("faded column is a part year")
		expect(body).toContain("each sits in its own column")
		expect(body).not.toContain("`traj`")
	})
})
