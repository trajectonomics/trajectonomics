import { describe, expect, test } from "bun:test"
import { dropOpenCodeBefore } from "../src/usage-filter"
import { usageRow } from "./support/rows"

const CUTOFF = "2026-10-23T14:00:00.000Z"

describe("dropOpenCodeBefore", () => {
	test("drops OpenCode database rows at or before the cutoff", () => {
		const rows = [
			usageRow({ source: "opencode-db", hourUtc: "2026-10-23T13:00:00.000Z" }),
			usageRow({ source: "opencode-db", hourUtc: CUTOFF }),
			usageRow({ source: "opencode-db", hourUtc: "2026-10-23T15:00:00.000Z" }),
		]
		const kept = dropOpenCodeBefore(rows, CUTOFF)
		expect(kept.map((row) => row.hourUtc)).toEqual(["2026-10-23T15:00:00.000Z"])
	})

	test("drops a combined row that includes the OpenCode database source", () => {
		const rows = [
			usageRow({ source: "opencode-db+pi-jsonl", hourUtc: CUTOFF }),
			usageRow({ source: "pi-jsonl+opencode-db", hourUtc: "2026-10-23T15:00:00.000Z" }),
		]
		const kept = dropOpenCodeBefore(rows, CUTOFF)
		expect(kept).toHaveLength(1)
		expect(kept[0]?.hourUtc).toBe("2026-10-23T15:00:00.000Z")
	})

	test("keeps other sources at the cutoff", () => {
		const rows = [usageRow({ source: "claude-code", hourUtc: CUTOFF })]
		expect(dropOpenCodeBefore(rows, CUTOFF)).toEqual(rows)
	})

	test("rejects a cutoff that is not a timestamp", () => {
		expect(() => dropOpenCodeBefore([], "yesterday")).toThrow()
	})
})
