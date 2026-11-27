import { describe, expect, test } from "bun:test"
import type { Granularity } from "@trajectonomics/data-collector/types"
import { type PeakRow, peaksByPlan, peaksByPlanAndTier } from "../src/core/peaks"

/** One synthetic row of `usage_hourly`, already summed over machines and models. */
function row(
	plan: string,
	hourUtc: string,
	tokensTotal: number,
	granularity: Granularity = "hour",
): PeakRow {
	return { plan, hourUtc, granularity, tokensTotal }
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
		expect(peak.fiveHours).toEqual({ tokens: 60, fromDay: "2026-11-24" })
	})

	test("counts a missing hour as zero, so a window is calendar-consecutive", () => {
		// 11:00–15:00 holds 50, not 60: the empty hours 12:00–14:00 count as zero.
		const peak = one([
			row("claude", "2026-11-24T10:00:00.000Z", 10),
			row("claude", "2026-11-24T11:00:00.000Z", 30),
			row("claude", "2026-11-24T15:00:00.000Z", 20),
		])
		expect(peak.fiveHours).toEqual({ tokens: 50, fromDay: "2026-11-24" })
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
		expect(peak.fiveHours).toEqual({ tokens: 150, fromDay: "2026-11-24" })
	})

	test("breaks a tie with the earliest window", () => {
		const peak = one([
			row("claude", "2026-11-20T10:00:00.000Z", 70),
			row("claude", "2026-11-24T10:00:00.000Z", 70),
		])
		expect(peak.fiveHours).toEqual({ tokens: 70, fromDay: "2026-11-20" })
	})

	test("leaves the five-hour peak null for a plan that reports days only", () => {
		const peak = one([
			row("mistral", "2026-11-20T00:00:00.000Z", 500, "day"),
			row("mistral", "2026-11-21T00:00:00.000Z", 700, "day"),
		])
		expect(peak.fiveHours).toBeNull()
		expect(peak.sevenDays).toEqual({ tokens: 1200, fromDay: "2026-11-20" })
		expect(peak.thirtyDays).toEqual({ tokens: 1200, fromDay: "2026-11-20" })
	})

	test("feeds the day windows from hourly and daily rows alike", () => {
		const peak = one([
			row("claude", "2026-11-24T10:00:00.000Z", 100),
			row("claude", "2026-11-25T00:00:00.000Z", 200, "day"),
		])
		expect(peak.fiveHours).toEqual({ tokens: 100, fromDay: "2026-11-24" })
		expect(peak.sevenDays).toEqual({ tokens: 300, fromDay: "2026-11-24" })
	})

	test("uses the whole span for a month, counting a gap as zero days", () => {
		const peak = one([
			row("claude", "2026-11-01T00:00:00.000Z", 10),
			row("claude", "2026-11-30T00:00:00.000Z", 20),
			row("claude", "2026-12-31T00:00:00.000Z", 30),
		])
		// 2026-11-01 to 2026-11-30 totals 30; the tie with 12-02 to 12-31 keeps the earliest start.
		expect(peak.thirtyDays).toEqual({ tokens: 30, fromDay: "2026-11-01" })
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
						fiveHours: { tokens: 100, fromDay: "2026-11-15" },
						sevenDays: { tokens: 100, fromDay: "2026-11-15" },
						thirtyDays: { tokens: 100, fromDay: "2026-11-15" },
					},
					{
						tier: "Pro",
						fiveHours: { tokens: 100, fromDay: "2026-11-14" },
						sevenDays: { tokens: 100, fromDay: "2026-11-14" },
						thirtyDays: { tokens: 100, fromDay: "2026-11-14" },
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
