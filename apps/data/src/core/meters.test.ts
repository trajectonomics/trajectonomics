import { describe, expect, test } from "bun:test"
import { METER_FRESH_MS, type MeterReadingRow, metersView } from "./meters"

const NOW_MS = Date.parse("2026-11-25T12:34:56.000Z")

function ago(ms: number): string {
	return new Date(NOW_MS - ms).toISOString()
}

function reading(plan: string, lastSampledAt: string): MeterReadingRow {
	return { plan, last_sampled_at: lastSampledAt }
}

describe("metersView", () => {
	test("is fresh just under three hours and stale at exactly three", () => {
		const meters = metersView(
			[reading("claude", ago(METER_FRESH_MS - 1)), reading("cursor", ago(METER_FRESH_MS))],
			[],
			NOW_MS,
		)
		expect(meters).toEqual([
			{ plan: "cursor", lastReadingAt: ago(METER_FRESH_MS), state: "stale" },
			{ plan: "claude", lastReadingAt: ago(METER_FRESH_MS - 1), state: "fresh" },
		])
	})

	test("is missing when the plan was used recently but never read", () => {
		const meters = metersView([], [{ plan: "opencode-go" }], NOW_MS)
		expect(meters).toEqual([{ plan: "opencode-go", lastReadingAt: null, state: "missing" }])
	})

	test("keeps a reading even when the plan saw no recent use", () => {
		const meters = metersView([reading("meta", ago(1))], [], NOW_MS)
		expect(meters).toEqual([{ plan: "meta", lastReadingAt: ago(1), state: "fresh" }])
	})

	test("omits a metered plan with no reading and no recent use", () => {
		expect(metersView([], [], NOW_MS)).toEqual([])
	})

	test("ignores a plan the sampler does not read", () => {
		const meters = metersView([reading("mistral", ago(60_000))], [{ plan: "mistral" }], NOW_MS)
		expect(meters).toEqual([])
	})

	test("keeps one row per plan, using its newest reading", () => {
		const meters = metersView(
			[reading("claude", ago(4 * 3_600_000)), reading("claude", ago(1))],
			[],
			NOW_MS,
		)
		expect(meters).toEqual([{ plan: "claude", lastReadingAt: ago(1), state: "fresh" }])
	})

	test("orders stale, then missing, then fresh, ties by plan id", () => {
		const meters = metersView(
			[
				reading("claude", ago(1)),
				reading("meta", ago(5 * 3_600_000)),
				reading("antigravity", ago(1)),
				reading("cursor", ago(8 * 3_600_000)),
			],
			[{ plan: "opencode-go" }],
			NOW_MS,
		)
		expect(meters.map((meter) => [meter.plan, meter.state])).toEqual([
			["cursor", "stale"],
			["meta", "stale"],
			["opencode-go", "missing"],
			["antigravity", "fresh"],
			["claude", "fresh"],
		])
	})

	test("treats an unreadable reading as stale rather than fresh", () => {
		const meters = metersView([reading("claude", "not-a-time")], [], NOW_MS)
		expect(meters).toEqual([{ plan: "claude", lastReadingAt: "not-a-time", state: "stale" }])
	})
})
