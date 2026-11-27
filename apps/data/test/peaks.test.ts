import { describe, expect, test } from "bun:test"
import type { Granularity } from "@trajectonomics/data-collector/types"
import { type PeakRow, peaksByPlan, peaksByPlanAndTier } from "../src/core/peaks"

/** One synthetic row of `usage_hourly`, already summed over machines and models. */
function row(
	plan: string,
	hourUtc: string,
	tokensTotal: number,
	granularity: Granularity = "hour",
	cacheRead = 0,
): PeakRow {
	return { plan, hourUtc, granularity, tokensTotal, cacheRead }
}

function one(rows: readonly PeakRow[]) {
	const result = peaksByPlan(rows)
	expect(result).toHaveLength(1)
	return result[0] as ReturnType<typeof peaksByPlan>[number]
}

describe("peaksByPlan", () => {
	test("answers an empty list for no rows", () => {
		expect(peaksByPlan([])).toEqual([])
	})

	test("sums models and machines of the same hour before taking the peak", () => {
		const peak = one([
			row("claude", "2026-11-24T10:00:00.000Z", 10),
			row("claude", "2026-11-24T10:00:00.000Z", 20),
			row("claude", "2026-11-24T11:00:00.000Z", 30),
		])
		expect(peak.fiveHours).toEqual({ tokens: 60, fromDay: "2026-11-24", cacheRead: 0 })
	})

	test("counts a missing hour as zero, so a window is calendar-consecutive", () => {
		// 11:00–15:00 holds 50, not 60: the empty hours 12:00–14:00 count as zero.
		const peak = one([
			row("opencode-go", "2026-11-24T10:00:00.000Z", 10),
			row("opencode-go", "2026-11-24T11:00:00.000Z", 30),
			row("opencode-go", "2026-11-24T15:00:00.000Z", 20),
		])
		expect(peak.fiveHours).toEqual({ tokens: 50, fromDay: "2026-11-24", cacheRead: 0 })
	})

	test("takes a window across midnight and names the day it starts", () => {
		const peak = one([
			row("claude", "2026-11-24T22:00:00.000Z", 20),
			row("claude", "2026-11-24T23:00:00.000Z", 30),
			row("claude", "2026-11-25T00:00:00.000Z", 40),
			row("claude", "2026-11-25T01:00:00.000Z", 10),
			row("claude", "2026-11-25T02:00:00.000Z", 50),
			row("claude", "2026-11-25T03:00:00.000Z", 10),
		])
		expect(peak.fiveHours).toEqual({ tokens: 150, fromDay: "2026-11-24", cacheRead: 0 })
	})

	test("breaks a tie with the earliest window", () => {
		const peak = one([
			row("claude", "2026-11-20T10:00:00.000Z", 70),
			row("claude", "2026-11-24T10:00:00.000Z", 70),
		])
		expect(peak.fiveHours).toEqual({ tokens: 70, fromDay: "2026-11-20", cacheRead: 0 })
	})

	test("leaves the five-hour peak null for a plan that reports days only", () => {
		const peak = one([
			row("mistral", "2026-11-20T00:00:00.000Z", 500, "day"),
			row("mistral", "2026-11-21T00:00:00.000Z", 700, "day"),
		])
		expect(peak.fiveHours).toBeNull()
		expect(peak.sevenDays).toEqual({ tokens: 1200, fromDay: "2026-11-20", cacheRead: 0 })
		expect(peak.thirtyDays).toEqual({ tokens: 1200, fromDay: "2026-11-20", cacheRead: 0 })
	})

	test("feeds the day windows from hourly and daily rows alike", () => {
		const peak = one([
			row("claude", "2026-11-24T10:00:00.000Z", 100),
			row("claude", "2026-11-25T00:00:00.000Z", 200, "day"),
		])
		expect(peak.fiveHours).toEqual({ tokens: 100, fromDay: "2026-11-24", cacheRead: 0 })
		expect(peak.sevenDays).toEqual({ tokens: 300, fromDay: "2026-11-24", cacheRead: 0 })
	})

	test("uses the whole span for a month, counting a gap as zero days", () => {
		const peak = one([
			row("claude", "2026-11-01T00:00:00.000Z", 10, "hour", 7),
			row("claude", "2026-11-30T00:00:00.000Z", 20, "hour", 3),
			row("claude", "2026-12-31T00:00:00.000Z", 30),
		])
		// 2026-11-01 to 2026-11-30 totals 30; the tie with 12-02 to 12-31 keeps the earliest start.
		expect(peak.thirtyDays).toEqual({ tokens: 30, fromDay: "2026-11-01", cacheRead: 10 })
	})

	test("takes the cache reads over the winning window, not its own best window", () => {
		const peak = one([
			row("claude", "2026-11-24T10:00:00.000Z", 10, "hour", 90),
			row("claude", "2026-11-24T11:00:00.000Z", 20, "hour", 10),
			row("claude", "2026-11-25T10:00:00.000Z", 10, "hour", 500),
		])
		expect(peak.fiveHours).toEqual({ tokens: 30, fromDay: "2026-11-24", cacheRead: 100 })
	})

	test("keeps plans apart and sorts them by id", () => {
		const result = peaksByPlan([
			row("opencode-go", "2026-11-24T10:00:00.000Z", 5),
			row("claude", "2026-11-24T10:00:00.000Z", 7),
		])
		expect(result.map((peak) => peak.plan)).toEqual(["claude", "opencode-go"])
		expect(result[0]?.fiveHours?.tokens).toBe(7)
		expect(result[1]?.fiveHours?.tokens).toBe(5)
	})
})

describe("anchored five-hour windows", () => {
	const reset = (plan: string) => [
		row(plan, "2026-11-24T00:00:00.000Z", 10),
		row(plan, "2026-11-24T01:00:00.000Z", 10),
		row(plan, "2026-11-24T04:00:00.000Z", 100),
		row(plan, "2026-11-24T05:00:00.000Z", 100),
		row(plan, "2026-11-24T06:00:00.000Z", 100),
		row(plan, "2026-11-24T07:00:00.000Z", 100),
		row(plan, "2026-11-24T08:00:00.000Z", 100),
	]

	test("starts Claude's next window after the first, so a reset splits the groups", () => {
		// The first window holds 00:00, 01:00 and 04:00 (120); the next starts at 05:00 (400).
		expect(one(reset("claude")).fiveHours).toEqual({
			tokens: 400,
			fromDay: "2026-11-24",
			cacheRead: 0,
		})
	})

	test("keeps the sliding window for a plan with no stated session start", () => {
		// A sliding window starts at 04:00 and holds the whole 500.
		expect(one(reset("opencode-go")).fiveHours?.tokens).toBe(500)
	})

	test("sums one lone run of activity", () => {
		const peak = one([
			row("claude", "2026-11-24T10:00:00.000Z", 10),
			row("claude", "2026-11-24T11:00:00.000Z", 20),
		])
		expect(peak.fiveHours).toEqual({ tokens: 30, fromDay: "2026-11-24", cacheRead: 0 })
	})

	test("starts a new window at the first hour with data after a gap", () => {
		const peak = one([
			row("claude", "2026-11-24T22:00:00.000Z", 10),
			row("claude", "2026-11-25T03:00:00.000Z", 100),
			row("claude", "2026-11-25T04:00:00.000Z", 100),
		])
		// 22:00's window ends at 02:00, so 03:00 opens the next one and wins with 200.
		expect(peak.fiveHours).toEqual({ tokens: 200, fromDay: "2026-11-25", cacheRead: 0 })
	})
})

describe("peaksByPlanAndTier", () => {
	const tierOf = (_plan: string, day: string) => (day < "2026-11-15" ? "Pro" : "Max")

	test("splits a plan's peaks at a tier change and never mixes the tiers in one window", () => {
		const result = peaksByPlanAndTier(
			[
				row("claude", "2026-11-14T23:00:00.000Z", 100),
				row("claude", "2026-11-15T00:00:00.000Z", 100),
			],
			tierOf,
		)
		expect(result).toEqual([
			{
				plan: "claude",
				tiers: [
					{
						tier: "Max",
						fiveHours: { tokens: 100, fromDay: "2026-11-15", cacheRead: 0 },
						sevenDays: { tokens: 100, fromDay: "2026-11-15", cacheRead: 0 },
						thirtyDays: { tokens: 100, fromDay: "2026-11-15", cacheRead: 0 },
					},
					{
						tier: "Pro",
						fiveHours: { tokens: 100, fromDay: "2026-11-14", cacheRead: 0 },
						sevenDays: { tokens: 100, fromDay: "2026-11-14", cacheRead: 0 },
						thirtyDays: { tokens: 100, fromDay: "2026-11-14", cacheRead: 0 },
					},
				],
			},
		])
	})

	test("keeps the tiers of different plans apart", () => {
		const result = peaksByPlanAndTier(
			[row("claude", "2026-11-24T10:00:00.000Z", 7), row("cursor", "2026-11-24T10:00:00.000Z", 5)],
			() => "Max",
		)
		expect(result.map((entry) => entry.plan)).toEqual(["claude", "cursor"])
		expect(result[0]?.tiers[0]?.fiveHours?.tokens).toBe(7)
	})
})
