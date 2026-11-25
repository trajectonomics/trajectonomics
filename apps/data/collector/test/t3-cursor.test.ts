import { describe, expect, test } from "bun:test"
import { extractT3Cursor } from "../src/extract/t3-cursor"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function cursor(timestamp: string, runId: string, outputTokens: number): string {
	return `[${timestamp}] NTIVE: ${JSON.stringify({
		provider: "cursor",
		event: {
			payload: {
				runId,
				type: "interaction.update",
				update: {
					type: "turn-ended",
					usage: {
						inputTokens: 100,
						outputTokens,
						cacheReadTokens: 40,
						cacheWriteTokens: 0,
						reasoningTokens: 7,
					},
				},
			},
		},
	})}`
}

describe("extractT3Cursor", () => {
	test("reads a turn-ended usage as the Cursor fallback", () => {
		const rows = extractT3Cursor(
			[[cursor("2026-11-24T10:30:00.000Z", "run-synthetic-a", 20)]],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("cursor")
		expect(rows[0]?.model).toBe("unknown-cursor")
		expect(rows[0]?.tokensIn).toBe(60)
		expect(rows[0]?.tokensTotal).toBe(120)
	})

	test("does not add reasoning that outputTokens already includes", () => {
		const rows = extractT3Cursor(
			[[cursor("2026-11-24T10:30:00.000Z", "run-synthetic-b", 20)]],
			context,
		)
		expect(rows[0]?.tokensOut).toBe(20)
		expect(rows[0]?.tokensTotal).toBe(120)
	})

	test("keeps the largest occurrence per runId", () => {
		const rows = extractT3Cursor(
			[
				[
					cursor("2026-11-24T10:30:00.000Z", "run-synthetic-c", 5),
					cursor("2026-11-24T10:30:01.000Z", "run-synthetic-c", 8),
				],
			],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensOut).toBe(8)
		expect(rows[0]?.requests).toBe(1)
	})
})
