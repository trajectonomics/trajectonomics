import { Database } from "bun:sqlite"
import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type CursorRun, chooseCursorUsage, extractCursor } from "../src/extract/cursor"
import { cursorStoreHasUsage, readCursorRuns } from "../src/stores/cursor"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const
const dirs: string[] = []

function cursorDb(createdAt: string): string {
	const dir = mkdtempSync(join(tmpdir(), "collector-cursor-"))
	dirs.push(dir)
	const path = join(dir, "index.db")
	const db = new Database(path)
	db.run("CREATE TABLE runs (run_id TEXT, model TEXT, usage_json TEXT, created_at TEXT)")
	db.run("INSERT INTO runs VALUES (?, ?, ?, ?)", [
		"run-synthetic",
		"grok-test",
		'{"inputTokens":100,"outputTokens":10,"cacheReadTokens":40,"cacheWriteTokens":0}',
		createdAt,
	])
	db.close()
	return path
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function run(createdAt: string, outputTokens = 10, usageJson?: string | null): CursorRun {
	return {
		runId: "run-synthetic",
		model: "grok-test",
		createdAt,
		usageJson:
			usageJson === undefined
				? JSON.stringify({
						inputTokens: 100,
						outputTokens,
						cacheReadTokens: 40,
						cacheWriteTokens: 0,
						reasoningTokens: 3,
						totalTokens: 100 + outputTokens,
					})
				: usageJson,
	}
}

function t3CursorLine(runId: string, outputTokens: number): string {
	return `[2026-11-24T10:30:00.000Z] NTIVE: ${JSON.stringify({
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

describe("extractCursor", () => {
	test("splits cached input out of Cursor's inputTokens", () => {
		const rows = extractCursor([run("2026-11-24T10:30:00.000Z")], context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("cursor")
		expect(rows[0]?.tokensIn).toBe(60)
		expect(rows[0]?.tokensOut).toBe(10)
		expect(rows[0]?.cacheRead).toBe(40)
		expect(rows[0]?.tokensTotal).toBe(110)
	})

	test("does not add reasoning that outputTokens already includes", () => {
		const rows = extractCursor([run("2026-11-24T10:30:00.000Z", 10)], context)
		// The fixture's reasoningTokens is 3 and totalTokens is input + output = 110.
		expect(rows[0]?.tokensOut).toBe(10)
		expect(rows[0]?.tokensTotal).toBe(110)
	})

	test("splits runs across an hour boundary", () => {
		const rows = extractCursor(
			[run("2026-11-24T10:59:59.000Z"), run("2026-11-24T11:00:00.000Z")],
			context,
		)
		expect(rows).toHaveLength(2)
	})

	test("skips runs without usage_json", () => {
		const rows = extractCursor([run("2026-11-24T10:30:00.000Z", 10, null)], context)
		expect(rows).toHaveLength(0)
	})
})

describe("chooseCursorUsage", () => {
	test("sees store usage outside the since window but reads no rows inside it", () => {
		const path = cursorDb("2026-11-20T00:00:00.000Z")
		expect(cursorStoreHasUsage(path)).toBe(true)
		expect(readCursorRuns(path, "2026-11-24T00:00:00.000Z")).toEqual([])
		expect(readCursorRuns(path, null)).toHaveLength(1)
	})

	test("keeps the empty store window and never falls back to T3 rows", () => {
		const rows = chooseCursorUsage(
			{
				storeHasUsage: true,
				storeRows: [],
				t3Files: [[t3CursorLine("run-synthetic-a", 20)]],
			},
			context,
		)
		expect(rows).toHaveLength(0)
	})

	test("falls back to T3 cursor lines when no store has any usage", () => {
		const rows = chooseCursorUsage(
			{
				storeHasUsage: false,
				storeRows: [],
				t3Files: [[t3CursorLine("run-synthetic-b", 20)]],
			},
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.source).toBe("t3-provider-log")
		expect(rows[0]?.tokensOut).toBe(20)
	})

	test("uses the store rows when they exist", () => {
		const rows = chooseCursorUsage(
			{
				storeHasUsage: true,
				storeRows: [run("2026-11-24T10:30:00.000Z")],
				t3Files: [[t3CursorLine("run-synthetic-c", 20)]],
			},
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.source).toBe("cursor-sdk")
	})
})
