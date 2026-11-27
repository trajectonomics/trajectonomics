import { describe, expect, test } from "bun:test"
import { parseClaudeQuota } from "../src/quota/parse"

const SAMPLED_AT = "2026-11-27T14:00:00.000Z"

describe("parseClaudeQuota", () => {
	test("maps five_hour and seven_day with normalised reset times", () => {
		const rows = parseClaudeQuota(
			{
				five_hour: { utilization: 23.0, resets_at: "2026-11-27T14:20:00.160769+00:00" },
				seven_day: { utilization: 31.0, resets_at: "2026-11-30T08:00:00.160792+00:00" },
				seven_day_opus: null,
			},
			SAMPLED_AT,
		)
		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				plan: "claude",
				window: "five_hour",
				sampledAt: SAMPLED_AT,
				usedPct: 23,
				resetsAt: "2026-11-27T14:20:00.160Z",
			},
			{
				contributor: "trajectonomics",
				plan: "claude",
				window: "weekly",
				sampledAt: SAMPLED_AT,
				usedPct: 31,
				resetsAt: "2026-11-30T08:00:00.160Z",
			},
		])
	})

	test("skips a null window", () => {
		const rows = parseClaudeQuota(
			{ five_hour: null, seven_day: { utilization: 31, resets_at: null } },
			SAMPLED_AT,
		)
		expect(rows).toHaveLength(1)
		expect(rows?.[0]?.window).toBe("weekly")
		expect(rows?.[0]?.resetsAt).toBeNull()
	})

	test("returns every window as null when both are null", () => {
		expect(parseClaudeQuota({ five_hour: null, seven_day: null }, SAMPLED_AT)).toEqual([])
	})

	test("rejects a body whose window is malformed", () => {
		expect(parseClaudeQuota({ five_hour: {}, seven_day: null }, SAMPLED_AT)).toBeNull()
		expect(parseClaudeQuota({ seven_day: null }, SAMPLED_AT)).toBeNull()
		expect(parseClaudeQuota([], SAMPLED_AT)).toBeNull()
		expect(parseClaudeQuota(null, SAMPLED_AT)).toBeNull()
	})

	test("rejects a percentage outside 0 to 100", () => {
		const body = { five_hour: { utilization: 101 }, seven_day: null }
		expect(parseClaudeQuota(body, SAMPLED_AT)).toBeNull()
	})

	test("rejects a reset time that is not a timestamp", () => {
		const body = { five_hour: { utilization: 10, resets_at: "later" }, seven_day: null }
		expect(parseClaudeQuota(body, SAMPLED_AT)).toBeNull()
	})
})
