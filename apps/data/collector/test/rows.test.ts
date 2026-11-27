import { describe, expect, test } from "bun:test"
import { dropUnknownPlans, isQuotaRow, parseIngestLines } from "../src/rows"
import { quotaRow, usageRow } from "./support/rows"

describe("parseIngestLines", () => {
	test("reads usage and quota lines and drops the quota kind marker", () => {
		const text = [
			JSON.stringify(usageRow()),
			"",
			JSON.stringify({ kind: "quota", ...quotaRow() }),
		].join("\n")
		const rows = parseIngestLines(text)

		expect(rows).toEqual([usageRow(), quotaRow()])
		expect("kind" in (rows[1] as object)).toBe(false)
	})

	test("rejects a line that is not JSON", () => {
		expect(() => parseIngestLines("{")).toThrow("line 1 is not JSON")
	})

	test("rejects a JSON value that is not a row", () => {
		expect(() => parseIngestLines("[]")).toThrow("line 1 is not a JSON object")
		expect(() => parseIngestLines('{"note":"synthetic"}')).toThrow(
			"line 1 is neither a usage row nor a quota row",
		)
	})
})

describe("isQuotaRow", () => {
	test("separates quota rows from usage rows", () => {
		expect(isQuotaRow(quotaRow())).toBe(true)
		expect(isQuotaRow(usageRow())).toBe(false)
		expect(isQuotaRow({ window: "synthetic" })).toBe(false)
		expect(isQuotaRow(null)).toBe(false)
	})
})

describe("dropUnknownPlans", () => {
	test("drops unknown plans and counts them once", () => {
		const result = dropUnknownPlans([
			usageRow(),
			usageRow({ plan: "unknown" }),
			usageRow({ plan: "unknown" }),
		])
		expect(result.rows).toHaveLength(1)
		expect(result.dropped).toBe(2)
	})
})
