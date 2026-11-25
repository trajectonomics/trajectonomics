import { describe, expect, test } from "bun:test"
import { NOMINAL_NAME, netWorthSeries, REAL_NAME } from "./chart"
import { ANNUAL_ROWS, projectionRunFixture } from "./fixtures.test-support"

describe("netWorthSeries", () => {
	test("draws the nominal series solid and the real series dashed, both by default", () => {
		const series = netWorthSeries(projectionRunFixture(), "both")
		expect(series.map((line) => line.name)).toEqual([NOMINAL_NAME, REAL_NAME])
		expect(series.map((line) => line.dashed)).toEqual([undefined, true])
	})

	test("places each point at its row's index and labels it with the year the row ends in", () => {
		const [nominal] = netWorthSeries(projectionRunFixture(), "both")
		expect(nominal?.points.map((point) => point.x)).toEqual([0, 1, 2])
		expect(nominal?.points.map((point) => point.xLabel)).toEqual(["2027", "2028", "2028"])
	})

	test("carries the CLI's own figures in its display strings, grouped and unchanged in value", () => {
		const [nominal, real] = netWorthSeries(projectionRunFixture(), "both")
		expect(nominal?.points[0]?.display).toBe("1,250,000.00")
		expect(nominal?.points[0]?.y).toBe(1250000)
		expect(real?.points[1]?.display).toBe("1,400,000.00")
		expect(real?.points[1]?.y).toBe(1400000)
	})

	test("returns only the nominal series for the nominal terms", () => {
		const series = netWorthSeries(projectionRunFixture(), "nominal")
		expect(series.map((line) => line.name)).toEqual([NOMINAL_NAME])
	})

	test("returns only the real series, still dashed, for the real terms", () => {
		const series = netWorthSeries(projectionRunFixture(), "real")
		expect(series.map((line) => line.name)).toEqual([REAL_NAME])
		expect(series[0]?.dashed).toBe(true)
	})

	test("has one point per annual row, the same count as the fixture's rows", () => {
		const [nominal] = netWorthSeries(projectionRunFixture(), "nominal")
		expect(nominal?.points).toHaveLength(ANNUAL_ROWS.length)
	})

	test("puts the first person's age under each year, and every person's age in the tooltip's title", () => {
		const run = projectionRunFixture()
		const [first, ...rest] = ANNUAL_ROWS
		if (first === undefined) throw new Error("the fixture has rows")
		const ages = [
			{ person: "me", age: 37 },
			{ person: "partner", age: 35 },
		]
		const withAges = {
			...run,
			tables: [{ name: "annual" as const, count: 3, rows: [{ ...first, ages }, ...rest] }],
		}
		const [nominal] = netWorthSeries(withAges, "nominal")
		expect(nominal?.points[0]).toMatchObject({
			xLabel: "2027",
			xTitle: "2027, me 37, partner 35",
			subLabel: "me 37",
		})
		expect(nominal?.points[1]?.subLabel).toBeUndefined()
	})

	test("has no points when the projection has no annual table", () => {
		const series = netWorthSeries(projectionRunFixture({ tables: [] }), "both")
		expect(series.every((line) => line.points.length === 0)).toBe(true)
	})
})
