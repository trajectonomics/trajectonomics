import { describe, expect, test } from "bun:test"
import { type CursorRun, extractCursor } from "../src/extract/cursor"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

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
