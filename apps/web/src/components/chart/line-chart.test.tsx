import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { LineSeries } from "../../lib/chart"
import { LineChart } from "./LineChart"

const net: LineSeries = {
	name: "Net worth",
	points: [
		{ x: 0, xLabel: "Jan 2026", y: 93000, display: "93,000.00" },
		{ x: 1, xLabel: "Feb 2026", y: 1082000, display: "1,082,000.00" },
	],
}

const plan: LineSeries = {
	name: "Plan",
	dashed: true,
	points: [
		{ x: 0, xLabel: "Jan 2026", y: 120000, display: "120,000.00" },
		{ x: 1, xLabel: "Feb 2026", y: 900000, display: "900,000.00" },
	],
}

describe("LineChart", () => {
	test("is an image with its label, and draws the axis labels as abbreviated figures", () => {
		const html = renderToStaticMarkup(
			<LineChart label="Net worth by month" series={[net]} hidden={false} />,
		)
		expect(html).toContain('role="img"')
		expect(html).toContain('aria-label="Net worth by month"')
		expect(html).toContain("1.2M")
		expect(html).toContain("Feb 2026")
	})

	test("masks its money axis labels when amounts are hidden, and keeps the month labels", () => {
		const html = renderToStaticMarkup(
			<LineChart label="Net worth by month" series={[net]} hidden />,
		)
		expect(html).not.toContain("1.2M")
		expect(html).toContain("•••••")
		expect(html).toContain("Feb 2026")
	})

	test("lists every series in a legend when there is more than one", () => {
		const html = renderToStaticMarkup(
			<LineChart label="Net worth and plan" series={[net, plan]} hidden={false} />,
		)
		expect(html).toContain("<ul")
		expect(html).toContain("stroke-dasharray")
		expect(html).toContain(">Plan<")
	})

	test("draws a dashed series with a dash pattern, so it is told apart without colour", () => {
		const html = renderToStaticMarkup(
			<LineChart label="Net worth and plan" series={[net, plan]} hidden={false} />,
		)
		expect(html).toContain('stroke-dasharray="6 4"')
	})

	test("says there is nothing to chart when no series has a point", () => {
		const html = renderToStaticMarkup(
			<LineChart label="Empty" series={[{ name: "none", points: [] }]} hidden={false} />,
		)
		expect(html).toContain("Nothing to chart yet")
		expect(html).not.toContain("<svg")
	})
})
