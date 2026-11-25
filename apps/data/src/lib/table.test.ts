import { describe, expect, test } from "bun:test"
import { rowNote, usageTable } from "./table"
import type { UsageRow } from "./types"

function row(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		day: "2026-11-24",
		plan: "claude",
		model: "claude-opus-5-5",
		tokensIn: 10,
		tokensOut: 20,
		cacheRead: 30,
		cacheWrite: 40,
		tokensTotal: 100,
		requests: 1,
		granularity: "hour",
		bestEffort: false,
		...overrides,
	}
}

describe("the usage table", () => {
	test("sums one plan and model across the window", () => {
		const rows = usageTable([row(), row({ day: "2026-11-25", tokensTotal: 50, requests: 2 })])
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			planName: "Claude",
			model: "claude-opus-5-5",
			tokensIn: 20,
			tokensOut: 40,
			cacheRead: 60,
			cacheWrite: 80,
			tokensTotal: 150,
			requests: 3,
		})
	})

	test("keeps a part null when every contributing row has no value", () => {
		const rows = usageTable([
			row({ plan: "mistral", model: "mistral-large", tokensIn: null, tokensOut: null }),
			row({
				day: "2026-11-25",
				plan: "mistral",
				model: "mistral-large",
				tokensIn: null,
				tokensOut: null,
			}),
		])
		expect(rows[0]?.tokensIn).toBeNull()
		expect(rows[0]?.tokensOut).toBeNull()
	})

	test("sums the parts that exist when a group mixes null and numbers", () => {
		const rows = usageTable([
			row({ plan: "mistral", model: "mistral-large", cacheRead: null }),
			row({ day: "2026-11-25", plan: "mistral", model: "mistral-large", cacheRead: 5 }),
		])
		expect(rows[0]?.cacheRead).toBe(5)
	})

	test("marks a daily export and a best-effort source", () => {
		const rows = usageTable([
			row({ plan: "mistral", model: "mistral-large", granularity: "day" }),
			row({ plan: "meta", model: "muse-spark", bestEffort: true }),
		])
		const mistral = rows.find((entry) => entry.plan === "mistral")
		const meta = rows.find((entry) => entry.plan === "meta")
		expect(mistral === undefined ? null : rowNote(mistral)).toBe("daily export, no in/out split")
		expect(meta === undefined ? null : rowNote(meta)).toBe("best-effort source")
	})

	test("has no note when a row is hourly and not best-effort", () => {
		const [entry] = usageTable([row()])
		expect(entry === undefined ? null : rowNote(entry)).toBeNull()
	})
})
