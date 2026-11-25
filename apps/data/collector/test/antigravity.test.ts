import { describe, expect, test } from "bun:test"
import { type AntigravityFile, extractAntigravity } from "../src/extract/antigravity"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function line(createdAt: string, input: number, output: number, model?: string): string {
	return JSON.stringify({
		type: "PLANNER_RESPONSE",
		created_at: createdAt,
		input_tokens: input,
		output_tokens: output,
		cache_read_tokens: 2,
		...(model === undefined ? {} : { model }),
	})
}

function file(conversationId: string, fileName: string, lines: string[]): AntigravityFile {
	return { conversationId, fileName, lines }
}

describe("extractAntigravity", () => {
	test("skips transcript_full and learns the conversation's only model", () => {
		const lines = [
			line("2026-11-24T10:30:00Z", 10, 1, "gemini-test"),
			line("2026-11-24T11:30:00Z", 20, 2),
		]
		const rows = extractAntigravity(
			[
				file("conv-synthetic-a", "transcript.jsonl", lines),
				file("conv-synthetic-a", "transcript_full.jsonl", lines),
			],
			context,
		)
		expect(rows).toHaveLength(2)
		expect(rows.map((row) => row.model)).toEqual(["gemini-test", "gemini-test"])
		expect(rows[0]?.source).toBe("antigravity-transcript")
	})

	test("falls back to unknown-gemini when the conversation has no model", () => {
		const rows = extractAntigravity(
			[file("conv-synthetic-b", "transcript.jsonl", [line("2026-11-24T10:30:00Z", 1, 1)])],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.model).toBe("unknown-gemini")
	})

	test("does not count a conversation that only has transcript_full", () => {
		const rows = extractAntigravity(
			[
				file("conv-synthetic-c", "transcript_full.jsonl", [
					line("2026-11-24T10:30:00Z", 1, 1, "gemini-test"),
				]),
			],
			context,
		)
		expect(rows).toHaveLength(0)
	})

	test("splits planner responses across an hour boundary", () => {
		const rows = extractAntigravity(
			[
				file("conv-synthetic-d", "transcript.jsonl", [
					line("2026-11-24T10:59:59Z", 1, 1, "gemini-test"),
					line("2026-11-24T11:00:00Z", 1, 1, "gemini-test"),
				]),
			],
			context,
		)
		expect(rows).toHaveLength(2)
	})
})
