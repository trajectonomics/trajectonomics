import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { LineSeries } from "../../lib/chart"
import LineChart from "./LineChart.svelte"

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
		const { body } = render(LineChart, {
			props: { label: "Net worth by month", series: [net], hidden: false },
		})
		expect(body).toContain('role="img"')
		expect(body).toContain('aria-label="Net worth by month"')
		expect(body).toContain("1.2M")
		expect(body).toContain("Feb 2026")
	})

	test("masks its money axis labels when amounts are hidden, and keeps the month labels", () => {
		const { body } = render(LineChart, {
			props: { label: "Net worth by month", series: [net], hidden: true },
		})
		expect(body).not.toContain("1.2M")
		expect(body).toContain("•••••")
		expect(body).toContain("Feb 2026")
	})

	test("lists every series in a legend when there is more than one", () => {
		const { body } = render(LineChart, {
			props: { label: "Net worth and plan", series: [net, plan], hidden: false },
		})
		expect(body).toContain("<ul")
		expect(body).toContain("stroke-dasharray")
		expect(body).toContain(">Plan<")
	})

	test("draws a dashed series with a dash pattern, so it is told apart without colour", () => {
		const { body } = render(LineChart, {
			props: { label: "Net worth and plan", series: [net, plan], hidden: false },
		})
		expect(body).toContain('stroke-dasharray="6 4"')
	})

	test("says there is nothing to chart when no series has a point", () => {
		const { body } = render(LineChart, {
			props: { label: "Empty", series: [{ name: "none", points: [] }], hidden: false },
		})
		expect(body).toContain("Nothing to chart yet")
		expect(body).not.toContain("<svg")
	})

	test("two markers on the same date draw their labels on two rows, not over each other", () => {
		const markers = [
			{ x: 0.5, label: "car-paid-off" },
			{ x: 0.5, label: "kid-starts-school" },
		]
		const { body } = render(LineChart, {
			props: { label: "Net worth", series: [net], hidden: false, markers },
		})
		const ys = [
			...body.matchAll(/<text[^>]*y="([\d.]+)"[^>]*>(car-paid-off|kid-starts-school)</g),
		].map((match) => Number(match[1]))
		expect(ys).toHaveLength(2)
		expect(ys[1]! - ys[0]!).toBe(14)
	})
})
