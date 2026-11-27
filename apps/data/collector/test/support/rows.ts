import type { QuotaRow, UsageRow } from "../../src/types"

/** A synthetic usage row for tests. */
export function usageRow(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		contributor: "trajectonomics",
		machine: "m-0123abcd",
		plan: "claude",
		model: "claude-test",
		hourUtc: "2026-11-27T10:00:00.000Z",
		granularity: "hour",
		tokensIn: 1,
		tokensOut: 2,
		cacheRead: 3,
		cacheWrite: 4,
		tokensTotal: 10,
		requests: 1,
		source: "claude-code",
		bestEffort: false,
		...overrides,
	}
}

/** A synthetic quota row for tests. */
export function quotaRow(overrides: Partial<QuotaRow> = {}): QuotaRow {
	return {
		contributor: "trajectonomics",
		plan: "claude",
		window: "five_hour",
		sampledAt: "2026-11-27T10:00:00.000Z",
		usedPct: 23,
		resetsAt: "2026-11-27T14:20:00.000Z",
		...overrides,
	}
}
