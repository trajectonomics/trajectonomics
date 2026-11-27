import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { collectUsage } from "../src/collect"

const dirs: string[] = []

function tempHome(): string {
	const dir = mkdtempSync(join(tmpdir(), "collector-collect-"))
	dirs.push(dir)
	return dir
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function record(createdAt: string, input: number, output: number, model?: string): string {
	return JSON.stringify({
		type: "PLANNER_RESPONSE",
		created_at: createdAt,
		input_tokens: input,
		output_tokens: output,
		cache_read_tokens: 2,
		...(model === undefined ? {} : { model }),
	})
}

function writeTranscript(path: string, lines: readonly string[]): void {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, lines.map((line) => `${line}\n`).join(""))
}

function geminiTranscript(home: string, conversationId: string): string {
	return join(
		home,
		".gemini",
		"antigravity",
		"brain",
		conversationId,
		".system_generated",
		"logs",
		"transcript.jsonl",
	)
}

function t3Transcript(home: string, conversationId: string): string {
	return join(
		home,
		".t3",
		"userdata",
		"providers",
		"antigravity",
		"instance-synthetic",
		"antigravity-acp",
		"brain",
		conversationId,
		".system_generated",
		"logs",
		"transcript.jsonl",
	)
}

function collect(home: string, since: string | null = null) {
	return collectUsage({ machine: "test-machine", since, mistralCsv: null, home })
}

describe("collectUsage Antigravity roots", () => {
	test("counts transcripts under both the gemini home and T3 Code's antigravity root", () => {
		const home = tempHome()
		writeTranscript(geminiTranscript(home, "conv-synthetic-gemini"), [
			record("2026-11-24T10:30:00Z", 10, 1, "gemini-test"),
			record("2026-11-24T10:45:00Z", 20, 2),
		])
		const t3Path = t3Transcript(home, "conv-synthetic-t3")
		writeTranscript(t3Path, [
			record("2026-11-24T11:05:00Z", 5, 3),
			record("2026-11-24T11:25:00Z", 7, 4, "gemini-test"),
		])
		const logs = dirname(t3Path)
		writeTranscript(join(logs, "transcript_full.jsonl"), [
			record("2026-11-24T11:05:00Z", 5, 3),
			record("2026-11-24T11:25:00Z", 7, 4, "gemini-test"),
		])
		writeTranscript(join(logs, "chunks", "transcript", "00000001.jsonl"), [
			record("2026-11-24T11:05:00Z", 500, 500, "gemini-test"),
		])
		writeTranscript(join(logs, "chunks", "transcript_full", "00000001.jsonl"), [
			record("2026-11-24T11:05:00Z", 500, 500, "gemini-test"),
		])
		writeTranscript(
			join(
				home,
				".t3",
				"userdata",
				"providers",
				"antigravity",
				"instance-synthetic",
				"antigravity-acp",
				"brain",
				"conv-synthetic-chunk-only",
				".system_generated",
				"logs",
				"chunks",
				"transcript",
				"00000001.jsonl",
			),
			[record("2026-11-24T11:35:00Z", 900, 900, "gemini-test")],
		)

		const rows = collect(home).filter((row) => row.plan === "antigravity")

		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				machine: "test-machine",
				plan: "antigravity",
				model: "gemini-test",
				hourUtc: "2026-11-24T10:00:00.000Z",
				granularity: "hour",
				tokensIn: 30,
				tokensOut: 3,
				cacheRead: 4,
				cacheWrite: null,
				tokensTotal: 37,
				requests: 2,
				source: "antigravity-transcript",
				bestEffort: false,
			},
			{
				contributor: "trajectonomics",
				machine: "test-machine",
				plan: "antigravity",
				model: "gemini-test",
				hourUtc: "2026-11-24T11:00:00.000Z",
				granularity: "hour",
				tokensIn: 12,
				tokensOut: 7,
				cacheRead: 4,
				cacheWrite: null,
				tokensTotal: 23,
				requests: 2,
				source: "antigravity-transcript",
				bestEffort: false,
			},
		])
	})

	test("counts a conversation present under both roots once", () => {
		const home = tempHome()
		const lines = [
			record("2026-11-24T09:10:00Z", 4, 2, "gemini-test"),
			record("2026-11-24T09:20:00Z", 6, 3),
		]
		writeTranscript(geminiTranscript(home, "conv-synthetic-shared"), lines)
		writeTranscript(t3Transcript(home, "conv-synthetic-shared"), lines)

		const rows = collect(home).filter((row) => row.plan === "antigravity")

		expect(rows).toHaveLength(1)
		expect(rows[0]?.hourUtc).toBe("2026-11-24T09:00:00.000Z")
		expect(rows[0]?.tokensIn).toBe(10)
		expect(rows[0]?.tokensOut).toBe(5)
		expect(rows[0]?.cacheRead).toBe(4)
		expect(rows[0]?.requests).toBe(2)
	})

	test("applies the since mtime filter to the T3 root too", () => {
		const home = tempHome()
		writeTranscript(geminiTranscript(home, "conv-synthetic-recent"), [
			record("2026-11-24T12:10:00Z", 1, 1, "gemini-test"),
		])
		const old = t3Transcript(home, "conv-synthetic-old")
		writeTranscript(old, [record("2026-11-24T12:20:00Z", 9, 9, "gemini-test")])
		const oldTime = new Date("2026-11-20T00:00:00.000Z")
		utimesSync(old, oldTime, oldTime)

		const rows = collect(home, "2026-11-23T00:00:00.000Z").filter(
			(row) => row.plan === "antigravity",
		)

		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensIn).toBe(1)
	})
})
