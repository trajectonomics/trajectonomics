import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { LineMarker, LineSeries } from "../../lib/chart"
import LineChart from "./LineChart.svelte"

// Rendered without a measured width, so the chart is FALLBACK_WIDTH (640) wide with a 64-pixel left margin
// and a 16-pixel right one: its x positions 0..2 land at pixels 64, 344 and 624.
const series: LineSeries = {
	name: "Net worth",
	points: [
		{ x: 0, xLabel: "2026", y: 100, display: "100.00" },
		{ x: 1, xLabel: "2027", y: 200, display: "200.00" },
		{ x: 2, xLabel: "2028", y: 300, display: "300.00" },
	],
}

function renderWith(markers: LineMarker[]): string {
	return render(LineChart, {
		props: { label: "Net worth", series: [series], markers, hidden: false },
	}).body
}

describe("LineChart markers", () => {
	test("draws a vertical rule at the marker's x, on the same scale as the points", () => {
		const body = renderWith([{ x: 1, label: "first-year" }])
		expect(body).toContain('x1="344" x2="344"')
		expect(body).toContain("<title>first-year</title>")
	})

	test("hangs the label of a marker past the middle to the left of its rule", () => {
		const body = renderWith([{ x: 2, label: "late" }])
		expect(body).toContain('text-anchor="end"')
		expect(renderWith([{ x: 0, label: "early" }])).toContain('text-anchor="start"')
	})

	// Rules at x 204 and about 210: the first label has no room on its own side, the right.
	test("draws a label moved to the other side of its rule on that side", () => {
		const body = renderWith([
			{ x: 0.5, label: "moved" },
			{ x: 0.52, label: "stays" },
		])
		expect(body).toMatch(/<text data-marker-label[^>]*x="200"[^>]*text-anchor="end"[^>]*>moved</)
		expect(body).toMatch(/<text data-marker-label[^>]*text-anchor="start"[^>]*>stays</)
	})

	test("draws the rule but no words for a marker with no room on either side", () => {
		const body = renderWith([
			{ x: 0.5, label: "one" },
			{ x: 0.52, label: "two" },
			{ x: 0.54, label: "three" },
		])
		expect(body.match(/<title>/g)).toHaveLength(3)
		expect(body.match(/data-marker-label/g)).toHaveLength(2)
		expect(body).not.toMatch(/>two<\/text>/)
	})

	test("draws no rule when no markers are passed", () => {
		expect(renderWith([])).not.toContain("<title>")
	})
})
