import { describe, expect, test } from "bun:test"
import {
	parseAntigravityQuota,
	parseCursorQuota,
	parseMuseQuota,
} from "../src/quota/parse-providers"

const SAMPLED_AT = "2026-11-27T14:00:00.000Z"

describe("parseAntigravityQuota", () => {
	test("maps gemini 5h and weekly buckets and ignores 3p or disabled buckets", () => {
		const rows = parseAntigravityQuota(
			{
				groups: [
					{
						buckets: [
							{
								bucketId: "gemini-weekly",
								window: "weekly",
								resetTime: "2026-12-01T00:00:00Z",
								remainingFraction: 0.6,
							},
							{
								bucketId: "gemini-5h",
								window: "5h",
								resetTime: "2026-11-27T18:00:00Z",
								remainingFraction: 0.875,
							},
							{
								bucketId: "gemini-disabled",
								window: "weekly",
								disabled: true,
								remainingFraction: 0.1,
							},
						],
					},
					{
						buckets: [
							{
								bucketId: "3p-weekly",
								window: "weekly",
								resetTime: "2026-12-01T00:00:00Z",
								remainingFraction: 0.2,
							},
						],
					},
				],
			},
			SAMPLED_AT,
		)
		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				plan: "antigravity",
				window: "weekly",
				sampledAt: SAMPLED_AT,
				usedPct: 40,
				resetsAt: "2026-12-01T00:00:00.000Z",
			},
			{
				contributor: "trajectonomics",
				plan: "antigravity",
				window: "five_hour",
				sampledAt: SAMPLED_AT,
				usedPct: 12.5,
				resetsAt: "2026-11-27T18:00:00.000Z",
			},
		])
	})

	test("treats omitted remainingFraction as exhausted (100% used)", () => {
		const rows = parseAntigravityQuota(
			{ buckets: [{ bucketId: "gemini-5h", window: "5h" }] },
			SAMPLED_AT,
		)
		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				plan: "antigravity",
				window: "five_hour",
				sampledAt: SAMPLED_AT,
				usedPct: 100,
				resetsAt: null,
			},
		])
	})

	test("rejects malformed bodies, empty Gemini buckets, or invalid fractions", () => {
		expect(parseAntigravityQuota(null, SAMPLED_AT)).toBeNull()
		expect(parseAntigravityQuota({}, SAMPLED_AT)).toBeNull()
		expect(parseAntigravityQuota({ groups: [] }, SAMPLED_AT)).toBeNull()
		const other = { buckets: [{ bucketId: "3p-weekly", window: "weekly", remainingFraction: 0.5 }] }
		const over = { buckets: [{ bucketId: "gemini-5h", window: "5h", remainingFraction: 1.5 }] }
		const badTs = {
			buckets: [{ bucketId: "gemini-5h", window: "5h", remainingFraction: 0.5, resetTime: "bad" }],
		}
		expect(parseAntigravityQuota(other, SAMPLED_AT)).toBeNull()
		expect(parseAntigravityQuota(over, SAMPLED_AT)).toBeNull()
		expect(parseAntigravityQuota(badTs, SAMPLED_AT)).toBeNull()
	})
})

describe("parseCursorQuota", () => {
	test("maps totalPercentUsed and billingCycleEnd to monthly window", () => {
		const endMs = Date.parse("2026-12-01T00:00:00.000Z")
		const rows = parseCursorQuota(
			{
				billingCycleStart: String(Date.parse("2026-11-01T00:00:00.000Z")),
				billingCycleEnd: String(endMs),
				planUsage: { totalPercentUsed: 42.5 },
			},
			SAMPLED_AT,
		)
		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				plan: "cursor",
				window: "monthly",
				sampledAt: SAMPLED_AT,
				usedPct: 42.5,
				resetsAt: "2026-12-01T00:00:00.000Z",
			},
		])
	})

	test("treats omitted totalPercentUsed as 0 and clamps overage above 100", () => {
		expect(parseCursorQuota({ planUsage: {} }, SAMPLED_AT)?.[0]?.usedPct).toBe(0)
		expect(
			parseCursorQuota({ planUsage: { totalPercentUsed: 120 } }, SAMPLED_AT)?.[0]?.usedPct,
		).toBe(100)
	})

	test("rejects missing planUsage, negative percent, or invalid cycle end", () => {
		expect(parseCursorQuota({}, SAMPLED_AT)).toBeNull()
		expect(parseCursorQuota({ planUsage: { totalPercentUsed: -1 } }, SAMPLED_AT)).toBeNull()
		expect(
			parseCursorQuota(
				{ billingCycleEnd: "not-a-ms", planUsage: { totalPercentUsed: 10 } },
				SAMPLED_AT,
			),
		).toBeNull()
	})
})

describe("parseMuseQuota", () => {
	test("maps window and weekly allowance fields for meta and clamps > 100", () => {
		const windowReset = Date.parse("2026-11-27T18:00:00.000Z")
		const weeklyReset = Date.parse("2026-12-01T00:00:00.000Z")
		const rows = parseMuseQuota(
			{
				allowance: {
					window: { usedPercent: 10, resetsAtMs: windowReset },
					weekly: { usedPercent: 105, resetsAtMs: weeklyReset },
				},
			},
			SAMPLED_AT,
		)
		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				plan: "meta",
				window: "five_hour",
				sampledAt: SAMPLED_AT,
				usedPct: 10,
				resetsAt: "2026-11-27T18:00:00.000Z",
			},
			{
				contributor: "trajectonomics",
				plan: "meta",
				window: "weekly",
				sampledAt: SAMPLED_AT,
				usedPct: 100,
				resetsAt: "2026-12-01T00:00:00.000Z",
			},
		])
	})

	test("skips a null window and rejects malformed allowance", () => {
		expect(
			parseMuseQuota(
				{ allowance: { window: null, weekly: { usedPercent: 15, resetsAtMs: null } } },
				SAMPLED_AT,
			),
		).toEqual([
			{
				contributor: "trajectonomics",
				plan: "meta",
				window: "weekly",
				sampledAt: SAMPLED_AT,
				usedPct: 15,
				resetsAt: null,
			},
		])
		expect(parseMuseQuota({ allowance: null }, SAMPLED_AT)).toBeNull()
		expect(
			parseMuseQuota({ allowance: { window: { usedPercent: -1 }, weekly: null } }, SAMPLED_AT),
		).toBeNull()
	})
})
