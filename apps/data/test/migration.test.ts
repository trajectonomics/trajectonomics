import { describe, expect, test } from "bun:test"
import { NOW_ISO } from "./support/fixtures"
import { harness } from "./support/http"

describe("the migration constraints", () => {
	test("rejects negative counts and out-of-range percentages", () => {
		const { database } = harness()
		const insertUsage = database.prepare(
			`INSERT INTO usage_hourly (
				contributor_id, machine, plan, model, hour_utc, granularity,
				tokens_in, tokens_total, requests, source, best_effort, received_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		expect(() =>
			insertUsage.run(
				"trajectonomics",
				"m-0123abcd",
				"claude",
				"claude-opus-5-5",
				"2026-11-24T00:00:00.000Z",
				"hour",
				-1,
				0,
				0,
				"claude-code",
				0,
				NOW_ISO,
			),
		).toThrow()
		expect(() =>
			insertUsage.run(
				"trajectonomics",
				"m-0123abcd",
				"claude",
				"claude-opus-5-5",
				"2026-11-24T00:00:00.000Z",
				"hour",
				0,
				0,
				-1,
				"claude-code",
				0,
				NOW_ISO,
			),
		).toThrow()
		const insertQuota = database.prepare(
			`INSERT INTO quota_sample (
				contributor_id, plan, window, sampled_at, used_pct, resets_at, received_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		expect(() =>
			insertQuota.run(
				"trajectonomics",
				"claude",
				"five_hour",
				"2026-11-24T00:00:00.000Z",
				100.5,
				null,
				NOW_ISO,
			),
		).toThrow()
	})
})
