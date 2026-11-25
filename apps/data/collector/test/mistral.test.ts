import { describe, expect, test } from "bun:test"
import { extractMistralCsv } from "../src/extract/mistral"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const

const HEADER =
	'"time_bucket","workspace_id","user_id","service_account_id","api_key_id","usage_type","billing_display_name","billing_metric","untracked","api_zone","service_tier","call_source","call_type","value","count","nb_api_calls"'

function row(
	metric: string,
	value: number,
	calls: number,
	bucket = "2026-11-14T00:00:00Z",
): string {
	return `"${bucket}","ws-synthetic","user-synthetic",,"key-synthetic","vibe","Display","${metric}",false,"global","standard","vibe_code","main_call",${value},1,${calls}`
}

describe("extractMistralCsv", () => {
	test("aggregates a metric per UTC day and keeps the total and call count", () => {
		const rows = extractMistralCsv(
			[HEADER, row("mistral-large-4", 100, 3), row("mistral-large-4", 50, 2)].join("\n"),
			context,
		)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("mistral")
		expect(rows[0]?.model).toBe("mistral-large-4")
		expect(rows[0]?.granularity).toBe("day")
		expect(rows[0]?.hourUtc).toBe("2026-11-14T00:00:00.000Z")
		expect(rows[0]?.tokensTotal).toBe(150)
		expect(rows[0]?.requests).toBe(5)
		expect(rows[0]?.tokensIn).toBeNull()
		expect(rows[0]?.tokensOut).toBeNull()
	})

	test("skips web_search", () => {
		const rows = extractMistralCsv([HEADER, row("web_search", 10, 1)].join("\n"), context)
		expect(rows).toHaveLength(0)
	})

	test("drops every id column from the output", () => {
		const rows = extractMistralCsv([HEADER, row("mistral-large-4", 1, 1)].join("\n"), context)
		const output = JSON.stringify(rows)
		expect(output).not.toContain("ws-synthetic")
		expect(output).not.toContain("user-synthetic")
		expect(output).not.toContain("key-synthetic")
		expect(output).not.toContain("workspace_id")
		expect(output).not.toContain("api_key_id")
	})

	test("keeps days apart", () => {
		const rows = extractMistralCsv(
			[
				HEADER,
				row("mistral-large-4", 1, 1, "2026-11-14T00:00:00Z"),
				row("mistral-large-4", 1, 1, "2026-11-15T00:00:00Z"),
			].join("\n"),
			context,
		)
		expect(rows).toHaveLength(2)
	})
})
