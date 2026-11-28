import { describe, expect, test } from "bun:test"
import { dayOnlyNote, dayOnlyPlans, daySeries, hourSeries, weekSeries } from "./buckets"
import type { HourlyRow } from "./hourly-types"
import type { UsageRow } from "./types"

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

function hour(hourUtc: string, tokensTotal: number, plan = "claude"): HourlyRow {
	return { hourUtc, plan, tokensTotal, requests: 1 }
}

describe("the day series", () => {
	test("is the daily chart series", () => {
		const series = daySeries([row({ day: "2026-11-25" })], ["2026-11-24", "2026-11-25"])
		expect(series[0]?.points).toEqual([
			{ label: "2026-11-24", tokens: 0 },
			{ label: "2026-11-25", tokens: 100 },
		])
	})
})

describe("the week series", () => {
	const DAYS = ["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]

	test("groups a month boundary by the week's Monday", () => {
		const series = weekSeries(
			[row({ day: "2026-11-28", tokensTotal: 10 }), row({ day: "2026-12-01", tokensTotal: 5 })],
			DAYS,
		)
		expect(series[0]?.points).toEqual([
			{ label: "Week of 23 Nov", tokens: 10 },
			{ label: "Week of 30 Nov", tokens: 5 },
		])
		expect(series[0]?.total).toBe(15)
	})

	test("sums only the days inside a partial edge week", () => {
		const series = weekSeries(
			[
				row({ day: "2026-11-24", tokensTotal: 999 }),
				row({ day: "2026-11-29", tokensTotal: 7 }),
				row({ day: "2026-12-02", tokensTotal: 3 }),
			],
			DAYS,
		)
		expect(series[0]?.points.map((point) => point.tokens)).toEqual([7, 3])
	})

	test("keeps one line per plan and titles it as the plan table does", () => {
		const series = weekSeries(
			[row({ day: "2026-11-30", plan: "cursor", model: "composer-1" }), row({ day: "2026-11-30" })],
			DAYS,
		)
		expect(series.map((line) => [line.plan, line.name])).toEqual([
			["claude", "Claude"],
			["cursor", "Cursor"],
		])
	})

	test("leaves a plan with no row out of the chart", () => {
		expect(weekSeries([row({ day: "2026-11-24" })], DAYS)).toEqual([])
	})
})

describe("the hour series", () => {
	test("draws every hour of the day, zero where no row landed", () => {
		const series = hourSeries([hour("2026-11-24T10:00:00.000Z", 40)], ["2026-11-24"], null)
		expect(series[0]?.points).toHaveLength(24)
		expect(series[0]?.points[0]).toEqual({ label: "24 Nov 00:00", tokens: 0 })
		expect(series[0]?.points[10]).toEqual({ label: "24 Nov 10:00", tokens: 40 })
		expect(series[0]?.points[23]).toEqual({ label: "24 Nov 23:00", tokens: 0 })
		expect(series[0]?.total).toBe(40)
	})

	test("sums two rows in the same hour into one bucket", () => {
		const series = hourSeries(
			[hour("2026-11-24T10:00:00.000Z", 40), hour("2026-11-24T10:00:00Z", 2)],
			["2026-11-24"],
			null,
		)
		expect(series[0]?.points[10]?.tokens).toBe(42)
	})

	test("cuts the live view at the current hour", () => {
		const series = hourSeries([], ["2026-11-28"], "2026-11-28T14:00:00.000Z")
		expect(series).toEqual([])
		const withRow = hourSeries(
			[hour("2026-11-28T14:00:00.000Z", 9)],
			["2026-11-28"],
			"2026-11-28T14:00:00.000Z",
		)
		expect(withRow[0]?.points).toHaveLength(15)
		expect(withRow[0]?.points.at(-1)).toEqual({ label: "28 Nov 14:00", tokens: 9 })
	})

	test("spans several days in order", () => {
		const series = hourSeries(
			[hour("2026-11-25T00:00:00.000Z", 1), hour("2026-11-24T00:00:00.000Z", 2)],
			["2026-11-24", "2026-11-25"],
			"2026-11-25T00:00:00.000Z",
		)
		expect(series[0]?.points).toHaveLength(25)
		expect(series[0]?.points[0]).toEqual({ label: "24 Nov 00:00", tokens: 2 })
		expect(series[0]?.points[24]).toEqual({ label: "25 Nov 00:00", tokens: 1 })
	})
})

describe("the day-only note", () => {
	test("names the plans that report whole days", () => {
		const rows = [
			row({ plan: "mistral", granularity: "day" }),
			row({ plan: "cursor", model: "composer-1" }),
			row({ plan: "cursor", model: "composer-1", granularity: "day" }),
		]
		expect(dayOnlyPlans(rows)).toEqual(["Cursor", "Mistral"])
	})

	test("writes one line or several", () => {
		expect(dayOnlyNote([])).toBeNull()
		expect(dayOnlyNote(["Mistral"])).toBe("Mistral reports whole days, so it has no hourly line.")
		expect(dayOnlyNote(["Cursor", "Mistral"])).toBe(
			"Cursor and Mistral report whole days, so they have no hourly line.",
		)
	})
})
