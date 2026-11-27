import { describe, expect, test } from "bun:test"
import { estimateLimit, type QuotaReading } from "./limits"
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

describe("estimateLimit segments", () => {
	test("keeps one segment when the reset jitters across a minute boundary", () => {
		const estimate = estimateLimit(
			[
				reading("10:00", 10, "2026-11-24T13:59:59.900Z"),
				reading("12:00", 30, "2026-11-24T14:00:00.100Z"),
			],
			hours([
				["10:00", 1_000],
				["11:00", 1_000],
			]),
		)
		expect(estimate?.points).toBe(20)
		expect(estimate?.tokens).toBe(10_000)
	})

	test("skips a segment with no hourly tokens behind it", () => {
		const estimate = estimateLimit(
			[
				reading("08:00", 0, "2026-11-24T09:30:00.000Z"),
				reading("09:00", 20, "2026-11-24T09:30:00.000Z"),
				reading("10:00", 10),
				reading("12:00", 30),
			],
			hours([
				["10:00", 1_000],
				["11:00", 1_000],
			]),
		)
		expect(estimate?.points).toBe(20)
		expect(estimate?.tokens).toBe(10_000)
	})
})
