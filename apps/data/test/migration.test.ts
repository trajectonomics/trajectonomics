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

	test("enforces foreign keys as D1 does", () => {
		const { database } = harness()
		expect(() =>
			database
				.prepare(
					"INSERT INTO ingest_log (contributor_id, received_at, rows, status) VALUES (?, ?, 1, 'accepted')",
				)
				.run("missing", NOW_ISO),
		).toThrow()
	})

	test("stores one tombstone per deleted account hash", () => {
		const { database } = harness()
		const insert = database.prepare(
			"INSERT INTO contributor_tombstone (auth_user_hash, deleted_at) VALUES (?, ?)",
		)
		insert.run("a".repeat(64), NOW_ISO)
		expect(() => insert.run("a".repeat(64), NOW_ISO)).toThrow()
	})

	test("keeps one web session per session hash", () => {
		const { database } = harness()
		const insert = database.prepare(
			`INSERT INTO web_session (session_hash, auth_user_id, created_at, expires_at)
			 VALUES (?, ?, ?, ?)`,
		)
		insert.run("b".repeat(64), "user-synthetic-1", NOW_ISO, NOW_ISO)
		expect(() => insert.run("b".repeat(64), "user-synthetic-2", NOW_ISO, NOW_ISO)).toThrow()
	})

	test("accepts only 0 or 1 as the best_effort flag", () => {
		const { database } = harness()
		const insertUsage = database.prepare(
			`INSERT INTO usage_hourly (
				contributor_id, machine, plan, model, hour_utc, granularity,
				tokens_in, tokens_total, requests, source, best_effort, received_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		const row = [
			"trajectonomics",
			"m-0123abcd",
			"claude",
			"claude-opus-5-5",
			"2026-11-24T00:00:00.000Z",
			"hour",
			0,
			0,
			0,
			"claude-code",
		]
		expect(() => insertUsage.run(...row, 2, NOW_ISO)).toThrow()
		expect(() => insertUsage.run(...row, -1, NOW_ISO)).toThrow()
		expect(() => insertUsage.run(...row, 1, NOW_ISO)).not.toThrow()

		const insertRollup = database.prepare(
			`INSERT INTO rollup_daily (
				series, day, plan, model, tokens_total, requests, granularity, best_effort
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		expect(() =>
			insertRollup.run(
				"measured-by-us",
				"2026-11-24",
				"claude",
				"claude-opus-5-5",
				0,
				0,
				"hour",
				2,
			),
		).toThrow()
		expect(() =>
			insertRollup.run(
				"measured-by-us",
				"2026-11-24",
				"claude",
				"claude-opus-5-5",
				0,
				0,
				"hour",
				0,
			),
		).not.toThrow()
	})
})
