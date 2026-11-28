import type { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { sha256Hex } from "../src/core/hash"
import { INTERNAL_HOST, LEGACY_HOST, SITE_ORIGIN } from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_ISO, NOW_MS, quotaSample, usageRow } from "./support/fixtures"
import { harness, ingestRequest } from "./support/http"
import { TEST_JWKS } from "./support/token"

const DELETE_PATH = "/internal/contributors/delete"
const DELETE_URL = `https://${INTERNAL_HOST}${DELETE_PATH}`

function internal(body: unknown): Request {
	return new Request(DELETE_URL, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	})
}

function del(context: ReturnType<typeof harness>, body: unknown): Promise<Response> {
	return handleRequest(internal(body), context.env, { nowMs: NOW_MS })
}

function count(database: Database, table: string): number {
	const row = database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
	return row.n
}

function seedUsage(database: Database, contributorId: string): void {
	const row = usageRow()
	database
		.prepare(
			`INSERT INTO usage_hourly (
				contributor_id, machine, plan, model, hour_utc, granularity,
				tokens_in, tokens_out, cache_read, cache_write, tokens_total,
				requests, source, best_effort, received_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			contributorId,
			row.machine,
			row.plan,
			row.model,
			row.hourUtc,
			row.granularity,
			row.tokensIn,
			row.tokensOut,
			row.cacheRead,
			row.cacheWrite,
			row.tokensTotal,
			row.requests,
			row.source,
			row.bestEffort ? 1 : 0,
			NOW_ISO,
		)
}

function seedCommunity(database: Database, id: string, authUserId: string): void {
	database
		.prepare(
			`INSERT INTO contributor (id, auth_user_id, handle, kind, created_at)
			 VALUES (?, ?, 'somebody', 'community', ?)`,
		)
		.run(id, authUserId, NOW_ISO)
	seedUsage(database, id)
	const quota = quotaSample()
	database
		.prepare(
			`INSERT INTO quota_sample (contributor_id, plan, window, sampled_at, used_pct, resets_at, received_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(id, quota.plan, quota.window, quota.sampledAt, quota.usedPct, quota.resetsAt, NOW_ISO)
	database
		.prepare(
			"INSERT INTO ingest_log (contributor_id, received_at, rows, status) VALUES (?, ?, ?, ?)",
		)
		.run(id, NOW_ISO, 2, "accepted")
}

/** Whether the value appears in any column of any table, as a string scan of every row. */
function holdsValue(database: Database, value: string): boolean {
	const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
		name: string
	}[]
	return tables.some(({ name }) => {
		const rows = database.prepare(`SELECT * FROM "${name}"`).all() as Record<string, unknown>[]
		return rows.some((row) => JSON.stringify(row).includes(value))
	})
}

describe("POST /internal/contributors/delete", () => {
	test("deletes a community contributor's rows and its contributor row", async () => {
		const context = harness()
		seedCommunity(context.database, "community-1", "person-alpha")
		const response = await del(context, { authUserId: "person-alpha" })
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ deleted: true })
		expect(count(context.database, "contributor")).toBe(1)
		expect(count(context.database, "usage_hourly")).toBe(0)
		expect(count(context.database, "quota_sample")).toBe(0)
		expect(count(context.database, "ingest_log")).toBe(0)
		expect(count(context.database, "contributor_tombstone")).toBe(1)
	})

	test("unbinds the org and keeps every row", async () => {
		const context = harness()
		const seeded = await handleRequest(
			ingestRequest({ usage: [usageRow()], quota: [quotaSample()] }),
			context.env,
			{ nowMs: NOW_MS, jwks: TEST_JWKS },
		)
		expect(seeded.status).toBe(200)
		context.database
			.prepare("UPDATE contributor SET auth_user_id = 'person-org' WHERE id = 'trajectonomics'")
			.run()
		const response = await del(context, { authUserId: "person-org" })
		expect(response.status).toBe(200)
		expect(orgBinding(context.database)).toBeNull()
		expect(count(context.database, "usage_hourly")).toBe(1)
		expect(count(context.database, "quota_sample")).toBe(1)
		expect(count(context.database, "rollup_daily")).toBe(1)
		expect(count(context.database, "ingest_log")).toBe(1)
	})

	test("stores only the hash, never the id", async () => {
		const context = harness()
		seedCommunity(context.database, "community-1", "person-alpha")
		await del(context, { authUserId: "person-alpha" })
		expect(holdsValue(context.database, "person-alpha")).toBe(false)
		const row = context.database
			.prepare("SELECT auth_user_hash FROM contributor_tombstone")
			.get() as { auth_user_hash: string }
		expect(row.auth_user_hash).toBe(await sha256Hex("person-alpha"))
	})

	test("answers 200 for an id it has never seen", async () => {
		const context = harness()
		const response = await del(context, { authUserId: "never-seen" })
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ deleted: true })
		expect(count(context.database, "contributor_tombstone")).toBe(1)
	})

	test("is idempotent for the same id", async () => {
		const context = harness()
		await del(context, { authUserId: "person-alpha" })
		const response = await del(context, { authUserId: "person-alpha" })
		expect(response.status).toBe(200)
		expect(count(context.database, "contributor_tombstone")).toBe(1)
	})

	test("answers 405 for GET", async () => {
		const context = harness()
		const response = await handleRequest(new Request(DELETE_URL, { method: "GET" }), context.env, {
			nowMs: NOW_MS,
		})
		expect(response.status).toBe(405)
		expect(response.headers.get("allow")).toBe("POST")
	})

	test("answers 400 for a body without a valid authUserId", async () => {
		const context = harness()
		for (const body of [
			{},
			{ authUserId: 7 },
			{ authUserId: "" },
			[],
			{ authUserId: "x".repeat(256) },
		]) {
			const response = await del(context, body)
			expect(response.status).toBe(400)
			expect(await response.json()).toEqual({ error: "invalid_request" })
		}
		expect(count(context.database, "contributor_tombstone")).toBe(0)
	})

	test("answers 413 for an oversized body", async () => {
		const context = harness()
		const response = await del(context, { authUserId: "x".repeat(2_000) })
		expect(response.status).toBe(413)
		expect(await response.json()).toEqual({ error: "payload_too_large" })
	})

	test("never deletes anything on another host", async () => {
		const context = harness()
		seedCommunity(context.database, "community-1", "person-alpha")
		const urls = [
			`${SITE_ORIGIN}${DELETE_PATH}`,
			`${SITE_ORIGIN}/data${DELETE_PATH}`,
			`https://${LEGACY_HOST}${DELETE_PATH}`,
		]
		for (const url of urls) {
			const response = await handleRequest(
				new Request(url, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ authUserId: "person-alpha" }),
				}),
				context.env,
				{ nowMs: NOW_MS },
			)
			expect(response.status).toBe(404)
		}
		expect(count(context.database, "contributor")).toBe(2)
		expect(count(context.database, "usage_hourly")).toBe(1)
		expect(count(context.database, "contributor_tombstone")).toBe(0)
	})
})

function orgBinding(database: Database): string | null {
	const row = database
		.prepare("SELECT auth_user_id FROM contributor WHERE id = 'trajectonomics'")
		.get() as { auth_user_id: string | null }
	return row.auth_user_id
}
