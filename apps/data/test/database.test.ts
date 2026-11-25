import type { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import type { IngestBatch, QuotaSample } from "../src/core/types"
import { writeIngest } from "../src/db/ingest"
import { readLastIngest, readRollups } from "../src/db/read"
import { NOW_ISO, quotaSample, usageRow } from "./support/fixtures"
import { harness } from "./support/http"

function batch(usage: UsageRow[] = [usageRow()], quota: QuotaSample[] = []): IngestBatch {
	return { contributorId: "trajectonomics", series: "measured-by-us", usage, quota }
}

function count(database: Database, table: string): number {
	const row = database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
	return row.n
}

function sumTokens(database: Database, day: string): number {
	const row = database
		.prepare("SELECT SUM(tokens_total) AS total FROM usage_hourly WHERE hour_utc LIKE ?")
		.get(`${day}%`) as { total: number }
	return row.total
}

describe("the D1 layer", () => {
	test("the migration seeds the org contributor", () => {
		const { database } = harness()
		expect(database.prepare("SELECT id, kind FROM contributor").all()).toEqual([
			{ id: "trajectonomics", kind: "org" },
		])
	})

	test("writes usage, quota, rollups and the ingest log", async () => {
		const { env, database } = harness()
		const outcome = await writeIngest(env.DB, batch([usageRow()], [quotaSample()]), NOW_ISO)
		expect(outcome).toEqual({ accepted: 2, days: ["2026-11-24"] })
		expect(count(database, "usage_hourly")).toBe(1)
		expect(count(database, "quota_sample")).toBe(1)
		expect(count(database, "rollup_daily")).toBe(1)
		expect(count(database, "ingest_log")).toBe(1)
		expect(await readLastIngest(env.DB)).toBe(NOW_ISO)
	})

	test("rollup sums match the hourly rows", async () => {
		const { env, database } = harness()
		await writeIngest(
			env.DB,
			batch([
				usageRow({ tokensTotal: 100 }),
				usageRow({
					hourUtc: "2026-11-24T03:00:00.000Z",
					tokensIn: 1,
					tokensOut: 2,
					cacheRead: 3,
					cacheWrite: 4,
					tokensTotal: 10,
				}),
			]),
			NOW_ISO,
		)
		const [rollup] = await readRollups(env.DB, {
			series: "measured-by-us",
			from: null,
			to: null,
			plan: null,
			model: null,
		})
		expect(rollup?.tokens_total).toBe(110)
		expect(rollup?.tokens_total).toBe(sumTokens(database, "2026-11-24"))
	})

	test("an upsert replay leaves every count and the rollup unchanged", async () => {
		const { env, database } = harness()
		const replay = batch([usageRow()], [quotaSample()])
		await writeIngest(env.DB, replay, NOW_ISO)
		const first = {
			usage: count(database, "usage_hourly"),
			quota: count(database, "quota_sample"),
			rollup: count(database, "rollup_daily"),
			log: count(database, "ingest_log"),
		}
		await writeIngest(env.DB, replay, NOW_ISO)
		expect({
			usage: count(database, "usage_hourly"),
			quota: count(database, "quota_sample"),
			rollup: count(database, "rollup_daily"),
			log: count(database, "ingest_log"),
		}).toEqual({ ...first, log: 2 })
		const [rollup] = await readRollups(env.DB, {
			series: "measured-by-us",
			from: null,
			to: null,
			plan: null,
			model: null,
		})
		expect(rollup?.tokens_total).toBe(100)
	})

	test("a replay with new totals updates the day's rollup", async () => {
		const { env, database } = harness()
		await writeIngest(env.DB, batch([usageRow()]), NOW_ISO)
		await writeIngest(
			env.DB,
			batch([usageRow({ tokensIn: 1, tokensOut: 1, cacheRead: 1, cacheWrite: 1, tokensTotal: 4 })]),
			NOW_ISO,
		)
		expect(count(database, "usage_hourly")).toBe(1)
		const [rollup] = await readRollups(env.DB, {
			series: "measured-by-us",
			from: null,
			to: null,
			plan: null,
			model: null,
		})
		expect(rollup?.tokens_total).toBe(4)
	})

	test("two interleaved ingests of one day add up", async () => {
		const { env } = harness()
		await Promise.all([
			writeIngest(env.DB, batch([usageRow({ machine: "m-aaaaaaaa" })]), NOW_ISO),
			writeIngest(env.DB, batch([usageRow({ machine: "m-bbbbbbbb" })]), NOW_ISO),
		])
		const [rollup] = await readRollups(env.DB, {
			series: "measured-by-us",
			from: null,
			to: null,
			plan: null,
			model: null,
		})
		expect(rollup?.tokens_total).toBe(200)
	})

	test("recomputes only the days the batch touches", async () => {
		const { env } = harness()
		await writeIngest(env.DB, batch([usageRow()]), NOW_ISO)
		await writeIngest(env.DB, batch([usageRow({ hourUtc: "2026-11-25T00:00:00.000Z" })]), NOW_ISO)
		const capped = await readRollups(env.DB, {
			series: "measured-by-us",
			from: null,
			to: "2026-11-24",
			plan: null,
			model: null,
		})
		expect(capped.map((row) => row.day)).toEqual(["2026-11-24"])
	})
})
