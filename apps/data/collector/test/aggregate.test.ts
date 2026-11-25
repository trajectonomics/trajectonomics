import { describe, expect, test } from "bun:test"
import { aggregateSamples, bucketStartUtc } from "../src/aggregate"
import type { UsageSample } from "../src/types"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function sample(overrides: Partial<UsageSample>): UsageSample {
	return {
		plan: "claude",
		model: "claude-test",
		timestamp: "2026-11-24T10:00:00.000Z",
		tokensIn: 1,
		tokensOut: 2,
		cacheRead: 3,
		cacheWrite: 4,
		requests: 1,
		source: "test",
		...overrides,
	}
}

describe("bucketStartUtc", () => {
	test("floors to the UTC hour and day", () => {
		expect(bucketStartUtc("2026-11-24T10:59:59.999Z")).toBe("2026-11-24T10:00:00.000Z")
		expect(bucketStartUtc("2026-11-24T10:59:59.999Z", "day")).toBe("2026-11-24T00:00:00.000Z")
	})

	test("accepts epoch milliseconds", () => {
		expect(bucketStartUtc(Date.parse("2026-11-24T10:59:59.999Z"))).toBe("2026-11-24T10:00:00.000Z")
	})
})

describe("aggregateSamples", () => {
	test("sums parts in one hour and separates the next hour", () => {
		const rows = aggregateSamples(
			[
				sample({ timestamp: "2026-11-24T10:59:59.999Z" }),
				sample({ timestamp: "2026-11-24T10:00:00.000Z", tokensIn: 10 }),
				sample({ timestamp: "2026-11-24T11:00:00.000Z" }),
			],
			context,
		)
		expect(rows).toHaveLength(2)
		expect(rows[0]?.hourUtc).toBe("2026-11-24T10:00:00.000Z")
		expect(rows[0]?.tokensIn).toBe(11)
		expect(rows[0]?.tokensTotal).toBe(29)
		expect(rows[0]?.requests).toBe(2)
		expect(rows[1]?.hourUtc).toBe("2026-11-24T11:00:00.000Z")
	})

	test("keeps a null part null and honours an explicit total", () => {
		const rows = aggregateSamples(
			[
				sample({
					tokensIn: null,
					tokensOut: null,
					cacheRead: null,
					cacheWrite: null,
					tokensTotal: 99,
				}),
			],
			context,
		)
		expect(rows[0]?.tokensIn).toBeNull()
		expect(rows[0]?.tokensTotal).toBe(99)
	})

	test("separates day-granularity rows at UTC midnight", () => {
		const rows = aggregateSamples(
			[
				sample({ timestamp: "2026-11-14T00:00:00Z", granularity: "day" }),
				sample({ timestamp: "2026-11-15T00:00:00Z", granularity: "day" }),
			],
			context,
		)
		expect(rows.map((row) => row.hourUtc)).toEqual([
			"2026-11-14T00:00:00.000Z",
			"2026-11-15T00:00:00.000Z",
		])
		expect(rows.every((row) => row.granularity === "day")).toBe(true)
	})

	test("sums the same plan, model and hour across sources and labels both", () => {
		const rows = aggregateSamples(
			[sample({ source: "pi-jsonl" }), sample({ source: "opencode-db", tokensIn: 10 })],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.source).toBe("opencode-db+pi-jsonl")
		expect(rows[0]?.tokensIn).toBe(11)
	})
})
