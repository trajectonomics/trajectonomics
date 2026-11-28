import { describe, expect, test } from "bun:test"
import { type MeterHourRow, meterHoursByPlan } from "./meter-hours"
import { HOUR_MS } from "./rules"

const TEN = Date.parse("2026-11-24T10:00:00.000Z") / HOUR_MS
const ELEVEN = Date.parse("2026-11-24T11:00:00.000Z") / HOUR_MS

/** A synthetic plan hour: one model's kinds, with its total equal to their sum. */
function row(overrides: Partial<MeterHourRow> = {}): MeterHourRow {
	return {
		plan: "claude",
		hour_utc: "2026-11-24T10:00:00.000Z",
		model: "claude-opus-5-5",
		tokens_in: 500_000,
		tokens_out: 100_000,
		cache_read: 1_000_000,
		cache_write: 0,
		tokens_total: 1_600_000,
		...overrides,
	}
}

describe("meterHoursByPlan", () => {
	test("counts cache reads in processed and leaves them out of uncached", () => {
		const hour = meterHoursByPlan([row()]).get("claude")?.get(TEN)
		expect(hour?.uncached).toBe(600_000)
		expect(hour?.processed).toBe(1_600_000)
		// $4 in, $20 out and $0.20 a cache read a million.
		expect(hour?.usd).toBeCloseTo(4.2, 6)
	})

	test("treats a total with no cache read as all uncached", () => {
		const hour = meterHoursByPlan([
			row({
				tokens_in: 100,
				tokens_out: 400,
				cache_read: null,
				cache_write: null,
				tokens_total: 500,
			}),
		])
			.get("claude")
			?.get(TEN)
		expect(hour?.uncached).toBe(500)
		expect(hour?.processed).toBe(500)
	})

	test("sums an hour's models and prices each at its own list price", () => {
		const hour = meterHoursByPlan([
			row({
				tokens_in: 1_000_000,
				tokens_out: 1_000_000,
				cache_read: 0,
				cache_write: 0,
				tokens_total: 2_000_000,
			}),
			row({
				model: "claude-sonnet-5-5",
				tokens_in: 0,
				tokens_out: 1_000_000,
				cache_read: 0,
				cache_write: 0,
				tokens_total: 1_000_000,
			}),
		])
			.get("claude")
			?.get(TEN)
		expect(hour?.uncached).toBe(3_000_000)
		expect(hour?.processed).toBe(3_000_000)
		// $4 + $20 on Opus, $10 on Sonnet.
		expect(hour?.usd).toBeCloseTo(34, 6)
	})

	test("leaves the whole hour unpriced when one model has no price", () => {
		const hour = meterHoursByPlan([
			row({
				tokens_in: 1_000_000,
				tokens_out: 0,
				cache_read: 0,
				cache_write: 0,
				tokens_total: 1_000_000,
			}),
			row({
				model: "made-up-model",
				tokens_in: 1_000_000,
				tokens_out: 0,
				cache_read: 0,
				cache_write: 0,
				tokens_total: 1_000_000,
			}),
		])
			.get("claude")
			?.get(TEN)
		expect(hour?.usd).toBeNull()
		expect(hour?.processed).toBe(2_000_000)
	})

	test("has no price for a row with no input or output to price", () => {
		const hour = meterHoursByPlan([
			row({
				tokens_in: null,
				tokens_out: null,
				cache_read: null,
				cache_write: null,
				tokens_total: 500,
			}),
		])
			.get("claude")
			?.get(TEN)
		expect(hour).toEqual({ uncached: 500, processed: 500, usd: null })
	})

	test("keeps plans and hours apart", () => {
		const hours = meterHoursByPlan([
			row(),
			row({ plan: "opencode-go", hour_utc: "2026-11-24T11:00:00.000Z" }),
		])
		expect(hours.get("claude")?.size).toBe(1)
		expect(hours.get("opencode-go")?.size).toBe(1)
		expect(hours.get("claude")?.get(ELEVEN)).toBeUndefined()
	})

	test("excludes third-party models from Antigravity's Gemini meter hours", () => {
		const hours = meterHoursByPlan([
			row({
				plan: "antigravity",
				model: "gemini-4-neon",
				tokens_in: 1_000,
				tokens_out: 500,
				cache_read: 0,
				cache_write: 0,
				tokens_total: 1_500,
			}),
			row({
				plan: "antigravity",
				model: "claude-opus-5-5",
				tokens_in: 9_000,
				tokens_out: 1_000,
				cache_read: 0,
				cache_write: 0,
				tokens_total: 10_000,
			}),
		])
		const hour = hours.get("antigravity")?.get(TEN)
		expect(hour?.uncached).toBe(1_500)
		expect(hour?.processed).toBe(1_500)
	})
})
