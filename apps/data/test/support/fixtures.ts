import type { UsageRow } from "@trajectonomics/data-collector/types"
import type { QuotaSample } from "../../src/core/types"

/** A synthetic ingest key; never a real secret. */
export const TEST_KEY = "test-key"

/** A fixed clock: 2026-11-25T12:34:56Z. */
export const NOW_MS = Date.parse("2026-11-25T12:34:56.000Z")
export const NOW_ISO = new Date(NOW_MS).toISOString()

/** A synthetic usage row, hand-written and within every rule. */
export function usageRow(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		contributor: "trajectonomics",
		machine: "m-0123abcd",
		plan: "claude",
		model: "claude-opus-5-5",
		hourUtc: "2026-11-24T00:00:00.000Z",
		granularity: "hour",
		tokensIn: 10,
		tokensOut: 20,
		cacheRead: 30,
		cacheWrite: 40,
		tokensTotal: 100,
		requests: 1,
		source: "claude-code",
		bestEffort: false,
		...overrides,
	}
}

/** A synthetic quota sample, hand-written and within every rule. */
export function quotaSample(overrides: Partial<QuotaSample> = {}): QuotaSample {
	return {
		contributor: "trajectonomics",
		plan: "claude",
		window: "five_hour",
		sampledAt: "2026-11-24T00:00:00.000Z",
		usedPct: 42.5,
		resetsAt: "2026-11-24T05:00:00.000Z",
		...overrides,
	}
}
