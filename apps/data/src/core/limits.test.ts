import { describe, expect, test } from "bun:test"
import { estimateLimit, planLimits, type QuotaReading } from "./limits"
import { HOUR_MS } from "./rules"

/** A reading at an hour of 2026-11-24 with a shared 15:00 reset unless a test says otherwise. */
function reading(
	sampledAt: string,
	usedPct: number,
	resetsAt: string | null = "2026-11-24T15:00:00.000Z",
): QuotaReading {
	return { sampledAt: `2026-11-24T${sampledAt}:00.000Z`, usedPct, resetsAt }
}

/** Hourly uncached tokens keyed by epoch hour, as the peaks read gives them. */
function hours(entries: readonly (readonly [string, number])[]): Map<number, number> {
	return new Map(
		entries.map(([hour, tokens]) => [Date.parse(`2026-11-24T${hour}:00.000Z`) / HOUR_MS, tokens]),
	)
}

describe("estimateLimit", () => {
	test("pools one segment's meter movement against the tokens used meanwhile", () => {
		const estimate = estimateLimit(
			[reading("10:00", 20), reading("11:00", 30), reading("12:00", 50)],
			hours([
				["10:00", 1_000],
				["11:00", 2_000],
				["12:00", 5_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 10_000,
			low: 9_677,
			high: 10_345,
			points: 30,
			readings: 3,
			rough: false,
		})
	})

	test("pools two segments split by a reset", () => {
		const estimate = estimateLimit(
			[
				reading("10:00", 10, "2026-11-24T12:00:00.000Z"),
				reading("11:00", 40, "2026-11-24T12:00:00.000Z"),
				reading("13:00", 0, "2026-11-24T18:00:00.000Z"),
				reading("14:00", 10, "2026-11-24T18:00:00.000Z"),
			],
			hours([
				["10:00", 3_000],
				["11:00", 9_000],
				["13:00", 1_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 10_000,
			low: 9_524,
			high: 10_526,
			points: 40,
			readings: 4,
			rough: false,
		})
	})

	test("keeps a reset time that jitters by seconds in one segment", () => {
		const estimate = estimateLimit(
			[
				reading("10:00", 10, "2026-11-24T15:00:02.000Z"),
				reading("11:00", 20, "2026-11-24T15:00:37.500Z"),
			],
			hours([["10:00", 1_000]]),
		)
		expect(estimate).toEqual({
			tokens: 10_000,
			low: 9_091,
			high: 11_111,
			points: 10,
			readings: 2,
			rough: false,
		})
	})

	test("has no estimate when the meter never moved", () => {
		expect(
			estimateLimit([reading("10:00", 42), reading("11:00", 42)], hours([["10:00", 1_000]])),
		).toBeNull()
	})

	test("has no upper bound until the movement beats one point per segment", () => {
		expect(
			estimateLimit([reading("10:00", 0), reading("11:00", 1)], hours([["10:00", 1_000]])),
		).toEqual({
			tokens: 100_000,
			low: 50_000,
			high: null,
			points: 1,
			readings: 2,
			rough: true,
		})
	})

	test("starts a new segment when the meter falls", () => {
		const estimate = estimateLimit(
			[reading("10:00", 50), reading("11:00", 20), reading("12:00", 50)],
			hours([
				["10:00", 4_000],
				["11:00", 1_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 3_333,
			low: 3_226,
			high: 3_448,
			points: 30,
			readings: 2,
			rough: false,
		})
	})

	test("leaves out the last reading's hour, which it cannot yet reflect", () => {
		const estimate = estimateLimit(
			[reading("10:00", 10), reading("12:00", 30)],
			hours([
				["10:00", 1_000],
				["11:00", 2_000],
				["12:00", 4_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 15_000,
			low: 14_286,
			high: 15_789,
			points: 20,
			readings: 2,
			rough: false,
		})
	})
})

describe("planLimits", () => {
	test("derives Claude's 30 days from its week and marks it", () => {
		const limits = planLimits(
			"claude",
			[
				{ window: "weekly", ...reading("10:00", 10) },
				{ window: "weekly", ...reading("12:00", 30) },
			],
			hours([
				["10:00", 1_000],
				["11:00", 1_000],
			]),
		)
		expect(limits.fiveHours).toBeNull()
		expect(limits.sevenDays).toEqual({
			tokens: 10_000,
			low: 9_524,
			high: 10_526,
			points: 20,
			readings: 2,
			rough: false,
		})
		expect(limits.thirtyDays).toEqual({
			tokens: 42_857,
			low: 40_817,
			high: 45_111,
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
				{ window: "monthly", ...reading("10:00", 10) },
				{ window: "monthly", ...reading("11:00", 30) },
			],
			hours([["10:00", 2_000]]),
		)
		expect(limits.thirtyDays).toEqual({
			tokens: 10_000,
			low: 9_524,
			high: 10_526,
			points: 20,
			readings: 2,
			rough: false,
		})
	})
})
