import { describe, expect, test } from "bun:test"
import { chartSeries } from "./series"
import type { UsageRow } from "./types"

const DAYS = ["2026-11-24", "2026-11-25", "2026-11-26"] as const

function row(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		day: "2026-11-24",
		plan: "claude",
		model: "claude-opus-5-5",
		tokensIn: 10,
		tokensOut: 20,
		cacheRead: 30,
		cacheWrite: 40,
		tokensTotal: 100,
		requests: 1,
		granularity: "hour",
		bestEffort: false,
		...overrides,
	}
}

describe("the chart series", () => {
	test("sums a plan's models into one line per day", () => {
		const series = chartSeries(
			[
				row({ tokensTotal: 100 }),
				row({ model: "claude-haiku-5-5", tokensTotal: 50 }),
				row({ day: "2026-11-26", tokensTotal: 25 }),
			],
			DAYS,
		)
		expect(series).toHaveLength(1)
		expect(series[0]?.name).toBe("Claude")
		expect(series[0]?.total).toBe(175)
		expect(series[0]?.points.map((point) => point.tokens)).toEqual([150, 0, 25])
	})

	test("plots zero on a day with no row", () => {
		const series = chartSeries([row({ day: "2026-11-25" })], DAYS)
		expect(series[0]?.points).toEqual([
			{ label: "2026-11-24", tokens: 0 },
			{ label: "2026-11-25", tokens: 100 },
			{ label: "2026-11-26", tokens: 0 },
		])
	})

	test("leaves a plan with no row out of the legend", () => {
		const series = chartSeries([row({ plan: "cursor", model: "composer-1" })], DAYS)
		expect(series.map((line) => line.plan)).toEqual(["cursor"])
	})

	test("orders plans as the plan table does", () => {
		const series = chartSeries(
			[
				row({ plan: "cursor", model: "composer-1" }),
				row({ plan: "claude", model: "claude-opus-5-5" }),
			],
			DAYS,
		)
		expect(series.map((line) => line.plan)).toEqual(["claude", "cursor"])
	})

	test("drops rows outside the window", () => {
		const series = chartSeries(
			[row({ day: "2026-11-20" }), row({ day: "2026-11-26", tokensTotal: 5 })],
			DAYS,
		)
		expect(series[0]?.total).toBe(5)
	})
})
