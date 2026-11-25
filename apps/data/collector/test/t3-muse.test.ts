import { describe, expect, test } from "bun:test"
import { extractT3Muse } from "../src/extract/t3-muse"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function line(timestamp: string, payload: object): string {
	return `[${timestamp}] NTIVE: ${JSON.stringify(payload)}`
}

type MuseOptions = {
	input?: number
	output?: number
	cacheRead?: number
	reasoning?: number
	session?: string
	turn?: string
	first?: string
	last?: string
	cumulativePrompt?: number
}

function muse(timestamp: string, options: MuseOptions = {}): string {
	const {
		input = 100,
		output = 20,
		cacheRead = 40,
		reasoning = 5,
		session = "session-synthetic",
		turn = "turn-synthetic",
		first = "event-first",
		last = "event-last",
		cumulativePrompt = input,
	} = options
	return line(timestamp, {
		provider: "muse",
		protocol: "synthetic",
		providerSessionId: session,
		method: "session/tokenUsage",
		params: {
			modelId: "muse-ember-1.0",
			sessionId: session,
			turnId: turn,
			totalTokens: input + output,
			cumulative: {
				promptTokens: cumulativePrompt,
				outputTokens: output,
				totalTokens: cumulativePrompt + output,
			},
			sourceRange: {
				first: { id: first, sequence: 0 },
				last: { id: last, sequence: 0 },
				stream: "synthetic",
			},
			usage: {
				inputTokens: input,
				outputTokens: output,
				cacheReadTokens: cacheRead,
				cacheWriteTokens: 0,
				reasoningTokens: reasoning,
			},
		},
	})
}

describe("extractT3Muse", () => {
	test("reads Muse usage as a best-effort Meta row", () => {
		const rows = extractT3Muse([[muse("2026-11-24T10:30:00.000Z")]], context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("meta")
		expect(rows[0]?.model).toBe("muse-ember-1.0")
		expect(rows[0]?.tokensIn).toBe(60)
		expect(rows[0]?.tokensOut).toBe(20)
		expect(rows[0]?.tokensTotal).toBe(120)
		expect(rows[0]?.bestEffort).toBe(true)
		expect(rows[0]?.source).toBe("t3-provider-log")
	})

	test("does not add reasoning that outputTokens already includes", () => {
		const rows = extractT3Muse(
			[[muse("2026-11-24T10:30:00.000Z", { output: 20, reasoning: 5 })]],
			context,
		)
		expect(rows[0]?.tokensOut).toBe(20)
		expect(rows[0]?.tokensTotal).toBe(120)
	})

	test("counts a replayed event once by session and source range", () => {
		const event = muse("2026-11-24T10:30:00.000Z", { first: "event-a", last: "event-b" })
		const rows = extractT3Muse([[event, event]], context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.requests).toBe(1)
		expect(rows[0]?.tokensIn).toBe(60)
	})

	test("keeps separate calls in one turn apart", () => {
		const rows = extractT3Muse(
			[
				[
					muse("2026-11-24T10:30:00.000Z", {
						input: 10,
						output: 2,
						cacheRead: 0,
						turn: "turn-synthetic",
						first: "event-a",
						last: "event-a",
					}),
					muse("2026-11-24T10:30:00.000Z", {
						input: 20,
						output: 3,
						cacheRead: 0,
						turn: "turn-synthetic",
						first: "event-b",
						last: "event-b",
					}),
				],
			],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensIn).toBe(30)
		expect(rows[0]?.tokensOut).toBe(5)
		expect(rows[0]?.requests).toBe(2)
	})

	test("counts the per-event delta, not params.cumulative", () => {
		const rows = extractT3Muse(
			[
				[
					muse("2026-11-24T10:30:00.000Z", {
						input: 10,
						cacheRead: 0,
						cumulativePrompt: 999,
					}),
				],
			],
			context,
		)
		expect(rows[0]?.tokensIn).toBe(10)
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
			[
				[
					muse("2026-11-24T10:59:59.000Z", { first: "event-a", last: "event-a" }),
					muse("2026-11-24T11:00:00.000Z", { first: "event-b", last: "event-b" }),
				],
			],
			context,
		)
		expect(rows).toHaveLength(2)
	})
})
