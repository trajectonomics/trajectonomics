import { describe, expect, test } from "bun:test"
import type { D1Database } from "@cloudflare/workers-types"
import { handleRequest } from "../src/http/router"
import { NOW_ISO, NOW_MS, usageRow } from "./support/fixtures"
import { get, harness, ingestRequest } from "./support/http"
import { silenceConsoleError } from "./support/log"

async function seed(context: ReturnType<typeof harness>): Promise<void> {
	const response = await handleRequest(ingestRequest({ usage: [usageRow()] }), context.env, {
		nowMs: NOW_MS,
		cache: context.cache,
	})
	expect(response.status).toBe(200)
}

function read(context: ReturnType<typeof harness>, nowMs = NOW_MS): Promise<Response> {
	return handleRequest(get("/api/health"), context.env, { nowMs, cache: context.cache })
}

describe("GET /api/health", () => {
	test("reports stale before any ingest arrived", async () => {
		const context = harness()
		const response = await read(context)
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			lastIngestAt: null,
			minutesSinceIngest: null,
			stale: true,
		})
	})

	test("reports the last ingest and stays fresh within three hours", async () => {
		const context = harness()
		await seed(context)
		const body = (await (await read(context)).json()) as Record<string, unknown>
		expect(body).toEqual({ lastIngestAt: NOW_ISO, minutesSinceIngest: 0, stale: false })
	})

	test("turns stale after 180 minutes", async () => {
		const context = harness()
		await seed(context)
		const response = await read(context, NOW_MS + 181 * 60_000)
		const body = (await response.json()) as { stale: boolean; minutesSinceIngest: number }
		expect(body.stale).toBe(true)
		expect(body.minutesSinceIngest).toBe(181)
	})

	test("sends the short cache header", async () => {
		const context = harness()
		const response = await read(context)
		expect(response.headers.get("cache-control")).toBe("public, max-age=60")
	})

	test("returns 503 when D1 fails", async () => {
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
		const response = await handleRequest(get("/api/health"), failing, { nowMs: NOW_MS })
		expect(response.status).toBe(503)
		restore()
	})
})
