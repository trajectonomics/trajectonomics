import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { LineSeries } from "../../lib/chart"
import LineChart from "./LineChart.svelte"

const bars: LineSeries = {
	name: "Taxed at 5%",
	points: [
		{ x: 0, xLabel: "Dec 2026", y: 150000, display: "150,000.00" },
		{ x: 1, xLabel: "Dec 2027", y: 200000, display: "200,000.00" },
	],
}
const rate: LineSeries = {
	name: "Top rate",
	dashed: true,
	points: [
		{ x: 0, xLabel: "Dec 2026", y: 500, display: "5%" },
		{ x: 1, xLabel: "Dec 2027", y: 1000, display: "10%" },
	],
}

function chart(hidden: boolean): string {
	return render(LineChart, {
		props: {
			label: "Taxable income by bracket",
			series: [bars],
			kind: "stacked-bars",
			step: { line: rate, label: (value: number) => `${value / 100}%` },
			hidden,
		},
	}).body
}

describe("LineChart with a step line", () => {
	test("labels a second axis on the right and draws the step line dashed", () => {
		const body = chart(false)
		expect(body).toContain(">10%</text>")
		expect(body).toContain('stroke-dasharray="6 4"')
		expect(body).toContain(">Top rate<")
	})

	test("masks the money axis and keeps the rate axis when amounts are hidden", () => {
		const body = chart(true)
		expect(body).toContain("•••••")
		expect(body).not.toContain("200k")
		expect(body).toContain(">10%</text>")
	})
})
