import { describe, expect, test } from "bun:test"
import { extractPi } from "../src/extract/pi"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

function line(
	timestamp: string,
	provider: string,
	model: string,
	input: number,
	output: number,
	reasoning: number,
): string {
	return JSON.stringify({
		type: "message",
		timestamp,
		message: {
			role: "assistant",
			provider,
			model,
			usage: {
				input,
				output,
				reasoning,
				cacheRead: 5,
				cacheWrite: 1,
				totalTokens: input + output + 6,
			},
		},
	})
}

describe("extractPi", () => {
	test("maps the provider to a plan and counts the parts", () => {
		const rows = extractPi(
			[[line("2026-11-24T10:30:00.000Z", "opencode-go", "deepseek-v4.1-flash", 100, 20, 9)]],
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("opencode-go")
		expect(rows[0]?.model).toBe("deepseek-v4.1-flash")
		expect(rows[0]?.tokensIn).toBe(100)
		expect(rows[0]?.tokensOut).toBe(20)
		expect(rows[0]?.cacheRead).toBe(5)
		expect(rows[0]?.tokensTotal).toBe(126)
	})

	test("maps the free OpenCode route and Command Code", () => {
		const rows = extractPi(
			[
				[
					line("2026-11-24T10:30:00.000Z", "opencode", "deepseek-v4.1-flash", 1, 1, 0),
					line("2026-11-24T10:30:00.000Z", "commandcode", "deepseek-v4.1-flash", 1, 1, 0),
				],
			],
			context,
		)
		expect(rows.map((row) => row.plan).sort()).toEqual(["command-code", "opencode-free"])
	})

	test("splits rows across an hour boundary", () => {
		const rows = extractPi(
			[
				[
					line("2026-11-24T10:59:59.000Z", "opencode-go", "deepseek-v4.1-flash", 1, 1, 0),
					line("2026-11-24T11:00:00.000Z", "opencode-go", "deepseek-v4.1-flash", 1, 1, 0),
				],
			],
			context,
		)
		expect(rows).toHaveLength(2)
	})
})
