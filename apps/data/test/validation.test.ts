import { describe, expect, test } from "bun:test"
import type { Principal } from "../src/core/types"
import { validateIngest } from "../src/core/validate"
import { NOW_MS, quotaSample, usageRow } from "./support/fixtures"

const PRINCIPAL: Principal = { contributorId: "trajectonomics", series: "measured-by-us" }

function validate(usage: unknown[], quota: unknown[] = [], nowMs = NOW_MS) {
	return validateIngest({ usage, quota }, PRINCIPAL, nowMs)
}

function codes(usage: unknown[], quota: unknown[] = [], nowMs = NOW_MS): string[] {
	const result = validate(usage, quota, nowMs)
	return result.ok ? [] : result.errors.map((error) => error.code)
}

describe("validateIngest", () => {
	test("accepts a valid batch and takes the contributor from the key", () => {
		const result = validate([usageRow()], [quotaSample()])
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.batch.contributorId).toBe("trajectonomics")
		expect(result.batch.series).toBe("measured-by-us")
		expect(result.batch.usage).toHaveLength(1)
		expect(result.batch.quota).toHaveLength(1)
	})

	test("accepts a usage-only body and normalises the bucket to UTC", () => {
		const result = validate([usageRow({ hourUtc: "2026-11-24T03:00:00+03:00" })])
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.batch.usage[0]?.hourUtc).toBe("2026-11-24T00:00:00.000Z")
	})

	test("rejects an empty batch", () => {
		expect(codes([])).toEqual(["EMPTY_BATCH"])
	})

	test("rejects a plan outside the plan table", () => {
		expect(codes([usageRow({ plan: "not-a-plan" })])).toContain("PLAN_UNKNOWN")
	})

	test("rejects a raw hostname instead of a machine alias", () => {
		expect(codes([usageRow({ machine: "prame-laptop" })])).toContain("MACHINE_ALIAS_INVALID")
	})

	test("rejects a row that names a different contributor", () => {
		expect(codes([usageRow({ contributor: "someone-else" as never })])).toContain(
			"CONTRIBUTOR_MISMATCH",
		)
	})

	test("rejects a bucket that does not start on its hour or day", () => {
		expect(codes([usageRow({ hourUtc: "2026-11-24T00:30:00.000Z" })])).toContain(
			"HOUR_NOT_ON_BOUNDARY",
		)
		expect(
			codes([usageRow({ hourUtc: "2026-11-24T05:00:00.000Z", granularity: "day" })]),
		).toContain("HOUR_NOT_ON_BOUNDARY")
	})

	test("rejects a bucket more than one hour ahead", () => {
		expect(codes([usageRow({ hourUtc: "2026-11-25T14:00:00.000Z" })])).toContain("HOUR_IN_FUTURE")
	})

	test("accepts a bucket exactly one hour ahead", () => {
		const now = Date.parse("2026-11-25T12:00:00.000Z")
		expect(codes([usageRow({ hourUtc: "2026-11-25T13:00:00.000Z" })], [], now)).toEqual([])
	})

	test("rejects invalid token counts", () => {
		expect(codes([usageRow({ tokensIn: -1 })])).toContain("TOKEN_NEGATIVE")
		expect(codes([usageRow({ tokensOut: 1.5 })])).toContain("TOKEN_NOT_INTEGER")
		expect(codes([usageRow({ cacheRead: 100_000_000_001 })])).toContain("TOKEN_TOO_LARGE")
	})

	test("rejects tokensTotal that disagrees with present parts", () => {
		expect(codes([usageRow({ tokensTotal: 99 })])).toContain("TOKENS_TOTAL_INCONSISTENT")
	})

	test("skips the total check when a part is missing", () => {
		expect(codes([usageRow({ cacheWrite: null, tokensTotal: 60 })])).toEqual([])
	})

	test("rejects an invalid request count", () => {
		expect(codes([usageRow({ requests: -1 })])).toContain("REQUESTS_INVALID")
	})

	test("rejects an unknown quota window", () => {
		expect(codes([], [quotaSample({ window: "daily" as never })])).toContain("QUOTA_WINDOW_UNKNOWN")
	})

	test("rejects a percentage outside 0 to 100", () => {
		expect(codes([], [quotaSample({ usedPct: 100.1 })])).toContain("QUOTA_USED_PCT_RANGE")
	})

	test("rejects an unreadable reset time", () => {
		expect(codes([], [quotaSample({ resetsAt: "soon" })])).toContain("RESETS_AT_INVALID")
	})

	test("reports the caller's path on the first error", () => {
		const result = validate([usageRow(), usageRow({ plan: "nope" })])
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.errors[0]?.path).toBe("usage[1].plan")
	})

	test("rejects more than 5000 rows in total", () => {
		const rows = Array.from({ length: 5_001 }, () => usageRow())
		expect(codes(rows)).toEqual(["TOO_MANY_ROWS"])
	})
})
