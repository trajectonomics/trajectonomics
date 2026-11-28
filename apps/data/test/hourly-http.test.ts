import { describe, expect, test } from "bun:test"
import { API_PATH, LEGACY_HOST, SITE_ORIGIN } from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_MS, usageRow, withTotal } from "./support/fixtures"
import { get, harness, legacy } from "./support/http"
import { silenceConsoleError } from "./support/log"
import { failingEnv, read, readWith, seed } from "./support/usage"

type HourlyBody = {
	asOf: string
	methodVersion: number
	series: string
	from: string
	to: string
	rows: { hourUtc: string; plan: string; tokensTotal: number; requests: number }[]
}

/** Seeds one community contributor's hour past the API, which never lets a row name another. */
function seedCommunityUsage(context: ReturnType<typeof harness>, tokensTotal: number): void {
	context.database
		.prepare(
			"INSERT INTO contributor (id, auth_user_id, handle, kind, created_at) VALUES (?, NULL, NULL, 'community', ?)",
		)
		.run("community-test", "2026-11-01T00:00:00.000Z")
	context.database
		.prepare(`INSERT INTO usage_hourly
			(contributor_id, machine, plan, model, hour_utc, granularity, tokens_in, tokens_out,
			 cache_read, cache_write, tokens_total, requests, source, best_effort, received_at)
			VALUES (?, ?, ?, ?, ?, 'hour', NULL, NULL, NULL, NULL, ?, 9, ?, 0, ?)`)
		.run(
			"community-test",
			"m-0000ffff",
			"claude",
			"claude-opus-5-5",
			"2026-11-24T10:00:00.000Z",
			tokensTotal,
			"t3-muse",
			"2026-11-24T12:00:00.000Z",
		)
}

describe("GET /api/usage/hourly", () => {
	test("sums machines and models into one row per plan and hour", async () => {
		const context = harness()
		await seed(context, [
			withTotal(100, { hourUtc: "2026-11-24T10:00:00.000Z" }),
			withTotal(50, { hourUtc: "2026-11-24T10:00:00.000Z", machine: "m-89abcdef" }),
			withTotal(25, {
				hourUtc: "2026-11-24T10:00:00.000Z",
				model: "claude-sonnet-5-5",
			}),
			withTotal(5, { hourUtc: "2026-11-24T11:00:00.000Z" }),
			withTotal(500, {
				plan: "mistral",
				model: "mistral-large-4",
				hourUtc: "2026-11-24T00:00:00.000Z",
				granularity: "day",
				source: "mistral-csv",
			}),
		])
		seedCommunityUsage(context, 9_999)
		const body = (await (
			await read(context, "/api/usage/hourly?from=2026-11-24&to=2026-11-24")
		).json()) as HourlyBody
		expect(body).toMatchObject({
			asOf: "2026-11-25",
			methodVersion: 1,
			series: "measured-by-us",
			from: "2026-11-24",
			to: "2026-11-24",
		})
		expect(body.rows).toEqual([
			{ hourUtc: "2026-11-24T10:00:00.000Z", plan: "claude", tokensTotal: 175, requests: 3 },
			{ hourUtc: "2026-11-24T11:00:00.000Z", plan: "claude", tokensTotal: 5, requests: 1 },
		])
	})

	test("carries no model, machine or contributor key", async () => {
		const context = harness()
		await seed(context, [usageRow({ hourUtc: "2026-11-24T10:00:00.000Z" })])
		const body = (await (
			await read(context, "/api/usage/hourly?from=2026-11-24")
		).json()) as HourlyBody
		const keys = body.rows.flatMap((row) => Object.keys(row))
		expect(keys.sort()).toEqual(["hourUtc", "plan", "requests", "tokensTotal"])
	})

	test("returns an empty series for a plan that reports whole days", async () => {
		const context = harness()
		await seed(context, [
			withTotal(500, {
				plan: "mistral",
				model: "mistral-large-4",
				hourUtc: "2026-11-24T00:00:00.000Z",
				granularity: "day",
				source: "mistral-csv",
			}),
		])
		const body = (await (
			await read(context, "/api/usage/hourly?from=2026-11-24&to=2026-11-24")
		).json()) as HourlyBody
		expect(body.rows).toEqual([])
	})

	test("sends the public cache headers", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const response = await read(context, "/api/usage/hourly")
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600, stale-if-error=86400")
	})

	test("serves the cached copy when D1 fails", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await seed(context, [usageRow()])
		const first = await read(context, "/api/usage/hourly?from=2026-11-24")
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		const second = await readWith(context, failingEnv(context), "/api/usage/hourly?from=2026-11-24")
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(firstBody)
		restore()
	})

	test("answers 503 when D1 fails and nothing is cached", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		const response = await readWith(context, failingEnv(context), "/api/usage/hourly")
		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "storage_error" })
		restore()
	})

	test("rejects a window longer than a week with 400", async () => {
		const context = harness()
		const response = await read(context, "/api/usage/hourly?from=2026-11-18&to=2026-11-25")
		expect(response.status).toBe(400)
		expect(await response.text()).toContain("INVALID_RANGE")
	})

	test("accepts GET only", async () => {
		const context = harness()
		const request = new Request(`${SITE_ORIGIN}${API_PATH}/usage/hourly`, { method: "POST" })
		const response = await handleRequest(request, context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(405)
		expect(response.headers.get("allow")).toBe("GET")
	})

	test("answers the old host's and the base path without a redirect", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		for (const request of [
			legacy("/api/usage/hourly"),
			new Request(`https://${LEGACY_HOST}/data/api/usage/hourly`),
		]) {
			const response = await handleRequest(request, context.env, {
				nowMs: NOW_MS,
				cache: context.cache,
			})
			expect(response.status).toBe(200)
			expect(response.headers.get("location")).toBeNull()
		}
	})

	test("shares one cached copy between the apex and the old host", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await seed(context, [usageRow()])
		const first = await handleRequest(get("/api/usage/hourly?from=2026-11-24"), context.env, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		const second = await handleRequest(
			legacy("/api/usage/hourly?from=2026-11-24"),
			failingEnv(context),
			{ nowMs: NOW_MS, cache: context.cache },
		)
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(firstBody)
		restore()
	})
})
