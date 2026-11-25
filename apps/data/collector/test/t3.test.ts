import { describe, expect, test } from "bun:test"
import { extractT3Cursor } from "../src/extract/t3-cursor"
import { extractT3Muse } from "../src/extract/t3-muse"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function line(timestamp: string, payload: object): string {
	return `[${timestamp}] NTIVE: ${JSON.stringify(payload)}`
}

function muse(timestamp: string, input: number, output: number): string {
	return line(timestamp, {
		provider: "muse",
		method: "session/tokenUsage",
		params: {
			modelId: "muse-ember-1.0",
			usage: {
				inputTokens: input,
				outputTokens: output,
				cacheReadTokens: 40,
				cacheWriteTokens: 0,
				reasoningTokens: 5,
			},
		},
	})
}

describe("extractT3Muse", () => {
	test("reads Muse usage as a best-effort Meta row", () => {
		const rows = extractT3Muse([[muse("2026-11-24T10:30:00.000Z", 100, 20)]], context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("meta")
		expect(rows[0]?.model).toBe("muse-ember-1.0")
		expect(rows[0]?.tokensIn).toBe(60)
		expect(rows[0]?.tokensOut).toBe(20)
		expect(rows[0]?.tokensTotal).toBe(120)
		expect(rows[0]?.bestEffort).toBe(true)
		expect(rows[0]?.source).toBe("t3-provider-log")
	})

	test("ignores claudeAgent, which Claude Code already counts", () => {
		const claudeAgent = line("2026-11-24T10:30:00.000Z", {
			provider: "claudeAgent",
			method: "session/tokenUsage",
			params: {
				modelId: "claude-test",
				usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 },
			},
		})
		expect(extractT3Muse([[claudeAgent]], context)).toHaveLength(0)
	})

	test("splits turns across an hour boundary", () => {
		const rows = extractT3Muse(
			[[muse("2026-11-24T10:59:59.000Z", 1, 1), muse("2026-11-24T11:00:00.000Z", 1, 1)]],
			context,
		)
		expect(rows).toHaveLength(2)
	})
})

describe("extractT3Cursor", () => {
	test("reads a turn-ended usage as the Cursor fallback", () => {
		const cursor = line("2026-11-24T10:30:00.000Z", {
			provider: "cursor",
			event: {
				payload: {
					type: "interaction.update",
					update: {
						type: "turn-ended",
						usage: {
							inputTokens: 100,
							outputTokens: 20,
							cacheReadTokens: 40,
							cacheWriteTokens: 0,
						},
					},
				},
			},
		})
		const rows = extractT3Cursor([[cursor]], context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("cursor")
		expect(rows[0]?.model).toBe("unknown-cursor")
		expect(rows[0]?.tokensIn).toBe(60)
		expect(rows[0]?.tokensTotal).toBe(120)
	})
})
