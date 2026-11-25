import { describe, expect, test } from "bun:test"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import type { IngestBatch } from "../src/core/types"
import { writeIngest } from "../src/db/ingest"
import { readRollups } from "../src/db/read"
import { NOW_ISO, usageRow } from "./support/fixtures"
import { harness } from "./support/http"

function batch(usage: UsageRow[]): IngestBatch {
	return { contributorId: "trajectonomics", series: "measured-by-us", usage, quota: [] }
}

describe("the ingest batch", () => {
	test("a 60-day backfill stays inside the D1 call budget", async () => {
		const { env, calls } = harness({ maxCalls: 50 })
		const usage = Array.from({ length: 60 }, (_, index) =>
			usageRow({
				hourUtc: new Date(
					Date.parse("2026-11-24T00:00:00.000Z") - index * 86_400_000,
				).toISOString(),
				machine: `m-${index.toString(16).padStart(8, "0")}`,
			}),
		)
		const outcome = await writeIngest(env.DB, batch(usage), NOW_ISO)
		expect(outcome.days).toHaveLength(60)
		const rollups = await readRollups(env.DB, {
			series: "measured-by-us",
			from: null,
			to: null,
			plan: null,
			model: null,
		})
		expect(rollups).toHaveLength(60)
		expect(calls()).toBeLessThanOrEqual(2)
	})

	test("a 5,000-row ingest is one batch with at most 100 parameters per statement", async () => {
		const { env, batches } = harness()
		const rows = Array.from({ length: 5_000 }, () => usageRow())
		await writeIngest(env.DB, batch(rows), NOW_ISO)
		expect(batches()).toHaveLength(1)
		const statements = batches()[0] ?? []
		expect(statements).toHaveLength(5_003)
		for (const statement of statements) {
			expect(statement.values.length).toBeLessThanOrEqual(100)
		}
	})
})
