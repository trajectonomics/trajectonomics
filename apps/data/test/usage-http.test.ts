import { describe, expect, test } from "bun:test"
import type { D1Database } from "@cloudflare/workers-types"
import { handleRequest } from "../src/http/router"
import { NOW_MS, usageRow } from "./support/fixtures"
import { get, harness, ingestRequest } from "./support/http"
import { silenceConsoleError } from "./support/log"

async function seed(context: ReturnType<typeof harness>, rows: unknown[]): Promise<void> {
	const response = await handleRequest(ingestRequest({ usage: rows }), context.env, {
		nowMs: NOW_MS,
		cache: context.cache,
	})
	expect(response.status).toBe(200)
}

function read(context: ReturnType<typeof harness>, path: string): Promise<Response> {
	return handleRequest(get(path), context.env, { nowMs: NOW_MS, cache: context.cache })
}

type UsageBody = {
	asOf: string
	methodVersion: number
	series: string
	rows: Record<string, unknown>[]
}

describe("GET /api/usage", () => {
	test("serves rollups without machine, contributor or hour fields", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const response = await read(context, "/api/usage?from=2026-11-24")
		expect(response.status).toBe(200)
		const body = (await response.json()) as UsageBody
		expect(body.asOf).toBe("2026-11-25")
		expect(body.methodVersion).toBe(1)
		expect(body.series).toBe("measured-by-us")
		expect(body.rows).toHaveLength(1)
		expect(Object.keys(body.rows[0] ?? {}).sort()).toEqual([
			"bestEffort",
			"cacheRead",
			"cacheWrite",
			"day",
			"granularity",
			"model",
			"plan",
			"requests",
			"tokensIn",
			"tokensOut",
			"tokensTotal",
		])
	})

	test("daily rows sum the hourly rows", async () => {
		const context = harness()
		await seed(context, [
			usageRow(),
			usageRow({
				hourUtc: "2026-11-24T03:00:00.000Z",
				tokensIn: 1,
				tokensOut: 2,
				cacheRead: 3,
				cacheWrite: 4,
				tokensTotal: 10,
			}),
		])
		const body = (await (await read(context, "/api/usage")).json()) as UsageBody
		const row = context.database
			.prepare("SELECT SUM(tokens_total) AS total FROM usage_hourly WHERE hour_utc LIKE ?")
			.get("2026-11-24%") as { total: number }
		expect(body.rows[0]?.["tokensTotal"]).toBe(row.total)
	})

	test("asOf caps the days and is reported back", async () => {
		const context = harness()
		await seed(context, [usageRow(), usageRow({ hourUtc: "2026-11-25T00:00:00.000Z" })])
		const body = (await (await read(context, "/api/usage?asOf=2026-11-24")).json()) as UsageBody
		expect(body.asOf).toBe("2026-11-24")
		expect(body.rows.map((row) => row["day"])).toEqual(["2026-11-24"])
	})

	test("filters by plan and model", async () => {
		const context = harness()
		await seed(context, [
			usageRow(),
			usageRow({ plan: "cursor", model: "composer-1", source: "cursor-store" }),
		])
		const byPlan = (await (await read(context, "/api/usage?plan=cursor")).json()) as UsageBody
		expect(byPlan.rows.map((row) => row["model"])).toEqual(["composer-1"])
		const byModel = (await (
			await read(context, "/api/usage?model=claude-opus-5-5")
		).json()) as UsageBody
		expect(byModel.rows.map((row) => row["plan"])).toEqual(["claude"])
	})

	test("sends the public cache headers", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const response = await read(context, "/api/usage")
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600, stale-if-error=86400")
	})

	test("serves the cached copy when D1 fails, keyed by the normalised URL", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const first = await read(context, "/api/usage?from=2026-11-24&plan=claude")
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		const failing = {
			...context.env,
			DB: {
				prepare: () => {
					throw new Error("storage down")
				},
			} as unknown as D1Database,
		}
		const second = await handleRequest(get("/api/usage?plan=claude&from=2026-11-24"), failing, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(firstBody)
	})

	test("returns 503 when D1 fails with no cached copy", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		const failing = {
			...context.env,
			DB: {
				prepare: () => {
					throw new Error("storage down")
				},
			} as unknown as D1Database,
		}
		const response = await handleRequest(get("/api/usage"), failing, { nowMs: NOW_MS })
		expect(response.status).toBe(503)
		restore()
	})

	test("rejects a bad query with 400", async () => {
		const context = harness()
		const response = await read(context, "/api/usage?plan=nope")
		expect(response.status).toBe(400)
		expect(await response.text()).toContain("PLAN_UNKNOWN")
	})

	test("accepts GET only", async () => {
		const context = harness()
		const request = new Request("https://data.test/api/usage", { method: "POST" })
		const response = await handleRequest(request, context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(405)
		expect(response.headers.get("allow")).toBe("GET")
	})

	test("unknown API paths fall through to a 404 JSON response", async () => {
		const context = harness()
		const response = await read(context, "/api/nope")
		expect(response.status).toBe(404)
	})
})
