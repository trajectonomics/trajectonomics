import { describe, expect, test } from "bun:test"
import { extractClaude } from "../src/extract/claude"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function line(requestId: string, timestamp: string, output: number, model = "claude-test"): string {
	return JSON.stringify({
		timestamp,
		requestId,
		message: {
			model,
			usage: {
				input_tokens: 10,
				output_tokens: output,
				cache_read_input_tokens: 2,
				cache_creation_input_tokens: 3,
			},
		},
	})
}

describe("extractClaude", () => {
	test("keeps only the largest output occurrence per requestId", () => {
		const rows = extractClaude(
			[
				[
					line("req-synthetic-a", "2026-11-24T10:01:00.000Z", 5),
					line("req-synthetic-a", "2026-11-24T10:01:01.000Z", 9),
					line("req-synthetic-a", "2026-11-24T10:01:02.000Z", 7),
				],
			],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensOut).toBe(9)
		expect(rows[0]?.tokensIn).toBe(10)
		expect(rows[0]?.cacheRead).toBe(2)
		expect(rows[0]?.cacheWrite).toBe(3)
		expect(rows[0]?.tokensTotal).toBe(24)
		expect(rows[0]?.requests).toBe(1)
		expect(rows[0]?.plan).toBe("claude")
		expect(rows[0]?.source).toBe("claude-code")
	})

	test("keeps requests on either side of an hour boundary apart", () => {
		const rows = extractClaude(
			[
				[
					line("req-synthetic-b", "2026-11-24T10:59:59.000Z", 1),
					line("req-synthetic-c", "2026-11-24T11:00:00.000Z", 1),
				],
			],
			context,
		)
		expect(rows.map((row) => row.hourUtc)).toEqual([
			"2026-11-24T10:00:00.000Z",
			"2026-11-24T11:00:00.000Z",
		])
	})

	test("deduplicates one requestId across two files", () => {
		const rows = extractClaude(
			[
				[line("req-synthetic-shared", "2026-11-24T10:00:00.000Z", 4)],
				[line("req-synthetic-shared", "2026-11-24T10:00:01.000Z", 9)],
			],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensOut).toBe(9)
		expect(rows[0]?.requests).toBe(1)
	})

	test("keeps one row when two occurrences tie on output tokens", () => {
		const rows = extractClaude(
			[
				[
					line("req-synthetic-tie", "2026-11-24T10:00:00.000Z", 5),
					line("req-synthetic-tie", "2026-11-24T10:00:01.000Z", 5),
				],
			],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensOut).toBe(5)
		expect(rows[0]?.requests).toBe(1)
	})

	test("skips synthetic models and entries without a requestId", () => {
		const rows = extractClaude(
			[
				[
					line("req-synthetic-d", "2026-11-24T10:00:00.000Z", 5, "<synthetic>"),
					JSON.stringify({
						timestamp: "2026-11-24T10:00:00.000Z",
						message: { model: "claude-test", usage: { output_tokens: 5 } },
					}),
				],
			],
			context,
		)
		expect(rows).toHaveLength(0)
	})
})
