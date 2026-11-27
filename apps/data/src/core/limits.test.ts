import { describe, expect, test } from "bun:test"
import { estimateLimit, type QuotaReading } from "./limits"
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

/** Hourly measures keyed by epoch hour; nothing here is priced and no cache read is counted. */
function hours(entries: readonly (readonly [string, number])[]): Map<number, MeterHour> {
	return new Map(
		entries.map(([at, uncached]) => [
			Date.parse(at) / HOUR_MS,
			{ uncached, processed: uncached, usd: null },
		]),
	)
}

describe("estimateLimit", () => {
	test("pools one segment's meter movement against the tokens used meanwhile", () => {
		const estimate = estimateLimit(
			[
				reading("2026-11-24T10:00:00.000Z", 20),
				reading("2026-11-25T10:00:00.000Z", 30),
				reading("2026-11-25T11:00:00.000Z", 50),
			],
			hours([
				["2026-11-24T10:00:00.000Z", 400_000],
				["2026-11-24T11:00:00.000Z", 200_000],
				["2026-11-25T10:00:00.000Z", 600_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 4_000_000,
			low: 3_870_968,
			high: 4_137_931,
			processed: { value: 4_000_000, low: 3_870_968, high: 4_137_931 },
			usd: null,
			points: 30,
			readings: 3,
			rough: false,
		})
	})

	test("pools two segments split by a reset", () => {
		const estimate = estimateLimit(
			[
				reading("2026-11-24T10:00:00.000Z", 10, "2026-11-24T12:00:00.000Z"),
				reading("2026-11-24T11:00:00.000Z", 40, "2026-11-24T12:00:00.000Z"),
				reading("2026-11-25T13:00:00.000Z", 0, "2026-11-25T18:00:00.000Z"),
				reading("2026-11-25T14:00:00.000Z", 10, "2026-11-25T18:00:00.000Z"),
			],
			hours([
				["2026-11-24T10:00:00.000Z", 3_000_000],
				["2026-11-24T11:00:00.000Z", 9_000_000],
				["2026-11-25T13:00:00.000Z", 1_000_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 10_000_000,
			low: 9_523_810,
			high: 10_526_316,
			processed: { value: 10_000_000, low: 9_523_810, high: 10_526_316 },
			usd: null,
			points: 40,
			readings: 4,
			rough: false,
		})
	})

	test("keeps a reset time that jitters by seconds in one segment", () => {
		const estimate = estimateLimit(
			[
				reading("2026-11-24T10:00:00.000Z", 10, "2026-11-24T15:00:02.000Z"),
				reading("2026-11-24T11:00:00.000Z", 20, "2026-11-24T15:00:37.500Z"),
			],
			hours([["2026-11-24T10:00:00.000Z", 1_000]]),
		)
		expect(estimate).toEqual({
			tokens: 10_000,
			low: 9_091,
			high: 11_111,
			processed: { value: 10_000, low: 9_091, high: 11_111 },
			usd: null,
			points: 10,
			readings: 2,
			rough: true,
		})
	})

	test("has no estimate when the meter never moved", () => {
		expect(
			estimateLimit(
				[reading("2026-11-24T10:00:00.000Z", 42), reading("2026-11-24T11:00:00.000Z", 42)],
				hours([["2026-11-24T10:00:00.000Z", 1_000]]),
			),
		).toBeNull()
	})

	test("has no upper bound until the movement beats one point per segment", () => {
		expect(
			estimateLimit(
				[reading("2026-11-24T10:00:00.000Z", 0), reading("2026-11-24T11:00:00.000Z", 1)],
				hours([["2026-11-24T10:00:00.000Z", 1_000]]),
			),
		).toEqual({
			tokens: 100_000,
			low: 50_000,
			high: null,
			processed: { value: 100_000, low: 50_000, high: null },
			usd: null,
			points: 1,
			readings: 2,
			rough: true,
		})
	})

	test("starts a new segment when the meter falls", () => {
		const estimate = estimateLimit(
			[
				reading("2026-11-24T10:00:00.000Z", 50),
				reading("2026-11-24T11:00:00.000Z", 20),
				reading("2026-11-24T12:00:00.000Z", 50),
			],
			hours([
				["2026-11-24T10:00:00.000Z", 4_000],
				["2026-11-24T11:00:00.000Z", 1_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 3_333,
			low: 3_226,
			high: 3_448,
			processed: { value: 3_333, low: 3_226, high: 3_448 },
			usd: null,
			points: 30,
			readings: 2,
			rough: true,
		})
	})

	test("leaves out the last reading's hour, which it cannot yet reflect", () => {
		const estimate = estimateLimit(
			[reading("2026-11-24T10:00:00.000Z", 10), reading("2026-11-24T12:00:00.000Z", 30)],
			hours([
				["2026-11-24T10:00:00.000Z", 1_000],
				["2026-11-24T11:00:00.000Z", 2_000],
				["2026-11-24T12:00:00.000Z", 4_000],
			]),
		)
		expect(estimate).toEqual({
			tokens: 15_000,
			low: 14_286,
			high: 15_789,
			processed: { value: 15_000, low: 14_286, high: 15_789 },
			usd: null,
			points: 20,
			readings: 2,
			rough: true,
		})
	})
})
