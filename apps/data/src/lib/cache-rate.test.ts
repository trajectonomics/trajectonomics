import { describe, expect, test } from "bun:test"
import { type CacheSource, cacheRateRows } from "./cache-rate"
import type { UsageRow } from "./types"

function total(overrides: Partial<CacheSource> = {}): CacheSource {
	return {
		plan: "claude",
		planName: "Claude",
		tokensIn: 10,
		tokensOut: 5,
		cacheRead: 50,
		cacheWrite: 5,
		tokensTotal: 100,
		cacheReadShare: 0.5,
		...overrides,
	}
}

function usage(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		day: "2026-11-27",
		plan: "claude",
		model: "claude-opus-5-5",
		tokensIn: 10,
		tokensOut: 5,
		cacheRead: 50,
		cacheWrite: 5,
		tokensTotal: 70,
		requests: 1,
		granularity: "hour",
		bestEffort: false,
		...overrides,
	}
}

describe("cacheRateRows", () => {
	test("sorts by cache rate, highest first", () => {
		const rows = cacheRateRows(
			[total(), total({ plan: "cursor", planName: "Cursor", cacheReadShare: 0.8 })],
			[],
		)
		expect(rows.map((row) => row.plan)).toEqual(["cursor", "claude"])
	})

	test("puts a plan with no cache split last", () => {
		const rows = cacheRateRows(
			[
				total({ plan: "mistral", planName: "Mistral", cacheRead: null, cacheReadShare: null }),
				total(),
			],
			[],
		)
		expect(rows.map((row) => row.plan)).toEqual(["claude", "mistral"])
		expect(rows[1]?.rate).toBeNull()
		expect(rows[1]?.cacheRead).toBeNull()
	})

	test("nests each plan's models, largest first, with their own rates", () => {
		const rows = cacheRateRows(
			[total()],
			[
				usage({ model: "claude-sonnet-5-5", tokensTotal: 20, cacheRead: 5 }),
				usage({ model: "claude-opus-5-5", tokensTotal: 50, cacheRead: 40 }),
			],
		)
		expect(rows[0]?.models.map((model) => model.model)).toEqual([
			"claude-opus-5-5",
			"claude-sonnet-5-5",
		])
		expect(rows[0]?.models[0]?.rate).toBeCloseTo(0.8, 6)
	})

	test("gives a model with no reported cache read no rate", () => {
		const rows = cacheRateRows(
			[total({ plan: "mistral", planName: "Mistral", cacheRead: null, cacheReadShare: null })],
			[usage({ plan: "mistral", cacheRead: null, tokensTotal: 10 })],
		)
		expect(rows[0]?.models[0]?.rate).toBeNull()
	})

	test("keeps the plan table's order on a tie", () => {
		const rows = cacheRateRows(
			[
				total({ plan: "mistral", planName: "Mistral" }),
				total({ plan: "claude", planName: "Claude" }),
			],
			[],
		)
		expect(rows.map((row) => row.plan)).toEqual(["claude", "mistral"])
	})
})
