import { describe, expect, test } from "bun:test"
import { healthReport } from "../src/core/health"
import { mergeUsage, usageKey } from "../src/core/merge"
import { affectedDays, buildRollups } from "../src/core/rollup"
import { usageRow } from "./support/fixtures"

describe("buildRollups", () => {
	test("sums hourly rows into one row per day, plan and model", () => {
		const rollups = buildRollups(
			[
				usageRow({ tokensIn: 1, tokensOut: 2, cacheRead: 3, cacheWrite: 4, tokensTotal: 10 }),
				usageRow({
					hourUtc: "2026-11-24T05:00:00.000Z",
					tokensIn: 10,
					tokensOut: 20,
					cacheRead: 30,
					cacheWrite: 40,
					tokensTotal: 100,
					requests: 2,
				}),
			],
			"measured-by-us",
		)
		expect(rollups).toEqual([
			{
				series: "measured-by-us",
				day: "2026-11-24",
				plan: "claude",
				model: "claude-opus-5-5",
				tokensIn: 11,
				tokensOut: 22,
				cacheRead: 33,
				cacheWrite: 44,
				tokensTotal: 110,
				requests: 3,
				granularity: "hour",
				bestEffort: false,
			},
		])
	})

	test("groups by plan and model, sorted by day, plan and model", () => {
		const rollups = buildRollups(
			[
				usageRow({ model: "z-model" }),
				usageRow({ model: "a-model" }),
				usageRow({ plan: "cursor", model: "composer-1" }),
				usageRow({ hourUtc: "2026-11-25T00:00:00.000Z" }),
			],
			"measured-by-us",
		)
		expect(rollups.map((row) => [row.day, row.plan, row.model])).toEqual([
			["2026-11-24", "claude", "a-model"],
			["2026-11-24", "claude", "z-model"],
			["2026-11-24", "cursor", "composer-1"],
			["2026-11-25", "claude", "claude-opus-5-5"],
		])
	})

	test("keeps a missing part missing and marks any day row", () => {
		const [rollup] = buildRollups(
			[
				usageRow({ cacheRead: null, bestEffort: true }),
				usageRow({ hourUtc: "2026-11-24T01:00:00.000Z", cacheRead: null, granularity: "day" }),
			],
			"measured-by-us",
		)
		expect(rollup?.cacheRead).toBeNull()
		expect(rollup?.granularity).toBe("day")
		expect(rollup?.bestEffort).toBe(true)
	})
})

describe("affectedDays", () => {
	test("returns each touched UTC day once, sorted", () => {
		expect(
			affectedDays([
				usageRow({ hourUtc: "2026-11-25T00:00:00.000Z" }),
				usageRow({ hourUtc: "2026-11-24T23:00:00.000Z" }),
				usageRow({ hourUtc: "2026-11-24T00:00:00.000Z" }),
			]),
		).toEqual(["2026-11-24", "2026-11-25"])
	})
})

describe("mergeUsage", () => {
	test("an incoming replay replaces the stored row with the same key", () => {
		const stored = usageRow({ tokensTotal: 100 })
		const replay = usageRow({
			tokensIn: 1,
			tokensOut: 1,
			cacheRead: 1,
			cacheWrite: 1,
			tokensTotal: 4,
		})
		const merged = mergeUsage([stored], [replay])
		expect(merged).toHaveLength(1)
		expect(merged[0]?.tokensTotal).toBe(4)
	})

	test("keeps rows from another machine", () => {
		const merged = mergeUsage(
			[usageRow({ machine: "m-aaaaaaaa" }), usageRow({ machine: "m-bbbbbbbb" })],
			[usageRow({ machine: "m-bbbbbbbb", tokensTotal: 400 })],
		)
		expect(merged).toHaveLength(2)
		expect(merged.find((row) => row.machine === "m-bbbbbbbb")?.tokensTotal).toBe(400)
	})

	test("the key covers machine, plan, model, hour and source", () => {
		const row = usageRow()
		expect(usageKey(row)).toBe(
			"m-0123abcd\u0000claude\u0000claude-opus-5-5\u00002026-11-24T00:00:00.000Z\u0000claude-code",
		)
	})
})

describe("healthReport", () => {
	test("reports stale when no ingest ever arrived", () => {
		expect(healthReport(null, Date.parse("2026-11-25T12:00:00.000Z"))).toEqual({
			lastIngestAt: null,
			minutesSinceIngest: null,
			stale: true,
		})
	})

	test("is fresh within three hours and stale past it", () => {
		const now = Date.parse("2026-11-25T12:00:00.000Z")
		expect(healthReport("2026-11-25T09:01:00.000Z", now).stale).toBe(false)
		expect(healthReport("2026-11-25T08:59:00.000Z", now).stale).toBe(true)
	})

	test("clamps a clock skew to zero minutes", () => {
		expect(
			healthReport("2026-11-25T12:05:00.000Z", Date.parse("2026-11-25T12:00:00.000Z"))
				.minutesSinceIngest,
		).toBe(0)
	})
})
