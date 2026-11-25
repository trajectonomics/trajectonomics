import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { baselineRun } from "../../lib/view/what-if/baseline"
import { DEMO, demoLens } from "../../lib/view/what-if/fixtures.test-support"
import WhatIfChart from "./WhatIfChart.svelte"

afterEach(() => {
	preferences.hidden = false
})

const NOTE =
	"The baseline is hidden with the amounts, because drawing it would show which way the change moved."

/** A copy of `run` whose yearly net worths all read `closing`, so the baseline sits higher or lower than the what-if. */
function withClosing(run: ProjectionRun, closing: string): ProjectionRun {
	const clone = structuredClone(run)
	for (const table of clone.tables) {
		if (table.name === "annual") {
			for (const row of table.rows) {
				row.closingNetWorth = closing
				row.realNetWorth = { ...row.realNetWorth, amount: closing }
			}
		}
	}
	return clone
}

function renderChart(baseline: ProjectionRun | null): string {
	const lens = demoLens()
	if (lens.run === null) throw new Error("the Demo has a run")
	return render(WhatIfChart, { props: { whatIf: lens.run, baseline, terms: "nominal" } }).body
}

describe("the what-if chart with amounts hidden", () => {
	test("draws only the what-if line, with no baseline, no dash and the note", () => {
		preferences.hidden = true
		const body = renderChart(baselineRun(DEMO, "base"))
		expect(body).not.toContain("Baseline")
		expect(body).not.toContain("dashed")
		expect(body).not.toContain('stroke-dasharray="6 4"')
		expect(body).toContain(NOTE)
		expect(body).toContain("Net worth at the close of each year: the what-if")
		expect(body).not.toContain("over the baseline")
		// One series is one path: the what-if solid, with the legend only for two or more series.
		expect(body.match(/<path/g) ?? []).toHaveLength(1)
		expect(body).not.toContain("<ul")
	})

	test("a higher baseline and a lower baseline give identical markup while hidden", () => {
		preferences.hidden = true
		const base = baselineRun(DEMO, "base")
		if (base === null) throw new Error("the Demo has a baseline")
		const higher = withClosing(base, "9000000.00")
		const lower = withClosing(base, "100000.00")
		expect(renderChart(higher)).toBe(renderChart(lower))
	})

	test("says nothing about a baseline when the Snapshot holds none", () => {
		preferences.hidden = true
		const body = renderChart(null)
		expect(body).not.toContain(NOTE)
		expect(body.match(/<path/g) ?? []).toHaveLength(1)
	})

	test("with amounts shown it draws both lines, names both and shows no note", () => {
		const body = renderChart(baselineRun(DEMO, "base"))
		expect(body).toContain("What-if: Nominal net worth")
		expect(body).toContain("Baseline: Nominal net worth")
		expect(body).toContain("over the baseline")
		expect(body).not.toContain(NOTE)
		expect(body).toContain('stroke-dasharray="6 4"')
		expect(body.match(/<path/g) ?? []).toHaveLength(2)
	})
})
