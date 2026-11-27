import { describe, expect, test } from "bun:test"
import { estimateLimit, type QuotaReading } from "./limits"
import { planLimits } from "./limits-plan"
import type { MeterHour } from "./meter-hours"
import { HOUR_MS } from "./rules"

const RESET = "2026-11-26T00:00:00.000Z"

/** A reading at a UTC instant; the default reset is later than every reading in a test. */
function reading(
	sampledAt: string,
	usedPct: number,
	resetsAt: string | null = RESET,
): QuotaReading {
	return { sampledAt, usedPct, resetsAt }
}

/**
 * Hourly measures keyed by epoch hour. A test that does not price anything leaves `usd` null, and
 * one that does not count cache reads leaves `processed` equal to `uncached`.
 */
function hours(
	entries: readonly (readonly [string, number, Partial<MeterHour>?])[],
): Map<number, MeterHour> {
	return new Map(
		entries.map(([at, uncached, overrides]) => [
			Date.parse(at) / HOUR_MS,
			{ uncached, processed: uncached, usd: null, ...overrides },
		]),
	)
}

describe("estimateLimit measures", () => {
	test("counts cache reads in processed but not in uncached", () => {
		const estimate = estimateLimit(
			[reading("2026-11-24T10:00:00.000Z", 20), reading("2026-11-25T10:00:00.000Z", 50)],
			hours([["2026-11-24T10:00:00.000Z", 600_000, { processed: 1_000_000 }]]),
		)
		expect(estimate?.tokens).toBe(2_000_000)
		expect(estimate?.processed).toEqual({
			value: 3_333_333,
			low: 3_225_806,
			high: 3_448_276,
		})
	})

	test("pools the hours' list prices into dollars", () => {
		const estimate = estimateLimit(
			[reading("2026-11-24T10:00:00.000Z", 20), reading("2026-11-25T10:00:00.000Z", 50)],
			hours([
				["2026-11-24T10:00:00.000Z", 600_000, { usd: 1.5 }],
				["2026-11-25T09:00:00.000Z", 600_000, { usd: 2.5 }],
			]),
		)
		expect(estimate?.usd).toEqual({ value: 13.33, low: 12.9, high: 13.79 })
	})

	test("has no dollar measure when an hour in the segment has no price", () => {
		const estimate = estimateLimit(
			[reading("2026-11-24T10:00:00.000Z", 20), reading("2026-11-25T10:00:00.000Z", 50)],
			hours([
				["2026-11-24T10:00:00.000Z", 600_000, { usd: 1.5 }],
				["2026-11-25T09:00:00.000Z", 600_000, { usd: null }],
			]),
		)
		expect(estimate?.usd).toBeNull()
		expect(estimate?.processed.value).toBeGreaterThan(0)
	})

	test("is rough below a day even with three points of movement", () => {
		const estimate = estimateLimit(
			[
				reading("2026-11-24T10:00:00.000Z", 10),
				reading("2026-11-24T11:00:00.000Z", 20),
				reading("2026-11-24T12:00:00.000Z", 40),
			],
			hours([
				["2026-11-24T10:00:00.000Z", 1_000],
				["2026-11-24T11:00:00.000Z", 1_000],
			]),
		)
		expect(estimate?.rough).toBe(true)
		expect(estimate?.points).toBe(30)
	})

	test("is solid at exactly a day with three points", () => {
		const estimate = estimateLimit(
			[reading("2026-11-24T10:00:00.000Z", 10), reading("2026-11-25T10:00:00.000Z", 40)],
			hours([["2026-11-24T10:00:00.000Z", 1_000]]),
		)
		expect(estimate?.rough).toBe(false)
	})
})

describe("planLimits", () => {
	test("derives Claude's 30 days from its week in all three measures", () => {
		const limits = planLimits(
			"claude",
			[
				{ window: "weekly", ...reading("2026-11-24T10:00:00.000Z", 10) },
				{ window: "weekly", ...reading("2026-11-25T12:00:00.000Z", 30) },
			],
			hours([
				["2026-11-24T10:00:00.000Z", 1_000, { processed: 5_000, usd: 1.5 }],
				["2026-11-24T11:00:00.000Z", 1_000, { processed: 5_000, usd: 2.5 }],
			]),
		)
		expect(limits.fiveHours).toBeNull()
		expect(limits.sevenDays).toEqual({
			tokens: 10_000,
			low: 9_524,
			high: 10_526,
			processed: { value: 50_000, low: 47_619, high: 52_632 },
			usd: { value: 20, low: 19.05, high: 21.05 },
			points: 20,
			readings: 2,
			rough: false,
		})
		expect(limits.thirtyDays).toEqual({
			tokens: 42_857,
			low: 40_817,
			high: 45_111,
			processed: { value: 214_285, low: 204_081, high: 225_565 },
			usd: { value: 85.71, low: 81.64, high: 90.21 },
			points: 20,
			readings: 2,
			rough: false,
			derived: true,
		})
	})

	test("uses a stated monthly window for OpenCode Go", () => {
		const limits = planLimits(
			"opencode-go",
			[
				{ window: "monthly", ...reading("2026-11-24T10:00:00.000Z", 10) },
				{ window: "monthly", ...reading("2026-11-25T11:00:00.000Z", 30) },
			],
			hours([["2026-11-24T10:00:00.000Z", 2_000]]),
		)
		expect(limits.thirtyDays).toEqual({
			tokens: 10_000,
			low: 9_524,
			high: 10_526,
			processed: { value: 10_000, low: 9_524, high: 10_526 },
			usd: null,
			points: 20,
			readings: 2,
			rough: false,
		})
	})
})
