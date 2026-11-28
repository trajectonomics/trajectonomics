import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { ProjectionCompare, ProjectionRun, Read } from "../../lib/contract"
import { type ChartState, chartSides, comparisonChart } from "../../lib/view/compare/chart"
import {
	reachable,
	SIDE_A,
	SIDE_B,
	UNREACHABLE,
} from "../../lib/view/compare/fixtures.test-support"
import {
	annualRow,
	compareOf,
	DEFAULT_DELTAS,
	ok,
	projectionRun,
} from "../../lib/view/compare/projection.test-support"
import CompareFocus from "./CompareFocus.svelte"

function row(index: number, from: string, to: string, closing: string) {
	return { ...annualRow(index, closing, closing, to), from }
}

function runOf(rows: ReturnType<typeof row>[]): ProjectionRun {
	return projectionRun({ tables: [{ name: "annual", count: rows.length, rows }] })
}

function chartOf(data: ProjectionCompare): ChartState {
	const projections: Record<string, Read<ProjectionRun>> = {
		[data.sides.a.scenario.name]: ok(
			runOf([
				row(0, "2039-10-31", "2040-10-30", "100.00"),
				row(1, "2040-10-31", "2041-10-30", "200.00"),
			]),
		),
		[data.sides.b.scenario.name]: ok(
			runOf([
				row(0, "2039-10-31", "2040-10-30", "300.00"),
				row(1, "2040-10-31", "2041-10-30", "400.00"),
			]),
		),
	}
	return comparisonChart(chartSides(projections, data), "nominal")
}

function bodyOf(data: ProjectionCompare): string {
	return render(CompareFocus, { props: { data, chart: chartOf(data) } }).body
}

const reaches = compareOf(
	{ ...SIDE_A, fi: reachable("2040-10-01") },
	{ ...SIDE_B, fi: UNREACHABLE },
	DEFAULT_DELTAS,
)

describe("CompareFocus", () => {
	test("writes one answer and the winner's Plan link, and no money figure", () => {
		const body = bodyOf(reaches)
		expect(body.match(/data-focus-answer/g)?.length).toBe(1)
		expect(body).toContain("Oct 2040")
		expect(body).toContain('href="/projection/?scenario=base"')
		expect(body).toContain("Open this plan")
		expect(body).toContain("data-primary-action")
		expect(body).not.toContain("THB")
		expect(body).not.toContain("100.00")
		expect(body).not.toContain("300.00")
	})

	test("answers Not reached in warn tone and draws no action when neither plan reaches", () => {
		const data = compareOf(
			{ ...SIDE_A, fi: UNREACHABLE },
			{ ...SIDE_B, fi: UNREACHABLE },
			DEFAULT_DELTAS,
		)
		const body = bodyOf(data)
		expect(body.match(/data-focus-answer/g)?.length).toBe(1)
		expect(body).toContain("Not reached")
		expect(body).not.toContain("Open this plan")
		expect(body).not.toContain("data-primary-action")
		expect(body).toContain('data-focus-tone="warn"')
	})
})
