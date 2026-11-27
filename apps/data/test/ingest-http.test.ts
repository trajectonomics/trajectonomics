import { describe, expect, spyOn, test } from "bun:test"
import type { D1Database } from "@cloudflare/workers-types"
import { INGEST_PATH, SITE_ORIGIN } from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_MS, quotaSample, usageRow } from "./support/fixtures"
import { get, harness, ingestRequest } from "./support/http"
import { silenceConsoleError } from "./support/log"

async function post(context: ReturnType<typeof harness>, body: unknown, key?: string) {
	return handleRequest(ingestRequest(body, key), context.env, {
		nowMs: NOW_MS,
		cache: context.cache,
	})
}

function count(context: ReturnType<typeof harness>, table: string): number {
	const row = context.database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
	return row.n
}

describe("POST /ingest", () => {
	test("rejects a wrong key with 401 and logs nothing", async () => {
		const context = harness()
		const logged = spyOn(console, "error").mockImplementation(() => {})
		const response = await post(context, { usage: [usageRow()] }, "wrong")
		expect(response.status).toBe(401)
		expect(count(context, "usage_hourly")).toBe(0)
		expect(logged).not.toHaveBeenCalled()
		logged.mockRestore()
	})

	test("rejects every request when the bootstrap key is unset, and says so once", async () => {
		const context = harness()
		const logged = spyOn(console, "error").mockImplementation(() => {})
		const env = {
			...context.env,
			INGEST_BOOTSTRAP_KEY: undefined,
		} as unknown as typeof context.env
		const response = await handleRequest(ingestRequest({ usage: [usageRow()] }), env, {
			nowMs: NOW_MS,
		})
		expect(response.status).toBe(401)
		expect(count(context, "usage_hourly")).toBe(0)
		expect(logged).toHaveBeenCalledTimes(1)
		expect(logged).toHaveBeenCalledWith("INGEST_BOOTSTRAP_KEY is not set")
		expect(JSON.stringify(logged.mock.calls)).not.toContain("test-key")
		logged.mockRestore()
	})

	test("rejects every request when the bootstrap key is empty, and says so once", async () => {
		const context = harness()
		const logged = spyOn(console, "error").mockImplementation(() => {})
		const env = { ...context.env, INGEST_BOOTSTRAP_KEY: "" }
		const response = await handleRequest(ingestRequest({ usage: [usageRow()] }, ""), env, {
			nowMs: NOW_MS,
		})
		expect(response.status).toBe(401)
		expect(count(context, "usage_hourly")).toBe(0)
		expect(logged).toHaveBeenCalledTimes(1)
		expect(logged).toHaveBeenCalledWith("INGEST_BOOTSTRAP_KEY is not set")
		logged.mockRestore()
	})

	test("rejects an empty bearer token", async () => {
		const context = harness()
		const response = await handleRequest(ingestRequest({ usage: [usageRow()] }, ""), context.env, {
			nowMs: NOW_MS,
		})
		expect(response.status).toBe(401)
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("rejects an unknown plan with 400 and the first errors", async () => {
		const context = harness()
		const response = await post(context, { usage: [usageRow({ plan: "nope" })] })
		expect(response.status).toBe(400)
		const body = (await response.json()) as { errors: { path: string; code: string }[] }
		expect(body.errors[0]).toMatchObject({ path: "usage[0].plan", code: "PLAN_UNKNOWN" })
	})

	test("rejects a raw hostname as machine with 400", async () => {
		const context = harness()
		const response = await post(context, { usage: [usageRow({ machine: "prame-laptop" })] })
		expect(response.status).toBe(400)
		expect(await response.text()).toContain("MACHINE_ALIAS_INVALID")
	})

	test("rejects a body naming a different contributor with 400", async () => {
		const context = harness()
		const response = await post(context, {
			usage: [usageRow({ contributor: "someone-else" as never })],
		})
		expect(response.status).toBe(400)
		expect(await response.text()).toContain("CONTRIBUTOR_MISMATCH")
	})

	test("rejects malformed JSON with 400", async () => {
		const context = harness()
		const request = new Request(`${SITE_ORIGIN}${INGEST_PATH}`, {
			method: "POST",
			headers: { authorization: "Bearer test-key", "content-type": "application/json" },
			body: "{",
		})
		const response = await handleRequest(request, context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(400)
	})

	test("rejects a body over 1 MB with 413", async () => {
		const context = harness()
		const row = usageRow({ model: "x".repeat(1_100_000) })
		const response = await post(context, { usage: [row] })
		expect(response.status).toBe(413)
	})

	test("rejects an oversize body with no Content-Length", async () => {
		const context = harness()
		const request = ingestRequest({ usage: [usageRow({ model: "x".repeat(1_100_000) })] })
		request.headers.delete("content-length")
		const response = await handleRequest(request, context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(413)
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("rejects an oversize body that lies about Content-Length", async () => {
		const context = harness()
		const request = ingestRequest({ usage: [usageRow({ model: "x".repeat(1_100_000) })] })
		request.headers.set("content-length", "10")
		const response = await handleRequest(request, context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(413)
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("rejects more than 5000 rows with 413", async () => {
		const context = harness()
		const quota = Array.from({ length: 5_001 }, () => quotaSample())
		const response = await post(context, { quota })
		expect(response.status).toBe(413)
	})

	test("accepts a batch and reports its rows and days", async () => {
		const context = harness()
		const response = await post(context, { usage: [usageRow()], quota: [quotaSample()] })
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ accepted: 2, days: ["2026-11-24"] })
		expect(count(context, "usage_hourly")).toBe(1)
		expect(count(context, "quota_sample")).toBe(1)
		expect(count(context, "rollup_daily")).toBe(1)
		expect(count(context, "ingest_log")).toBe(1)
	})

	test("an upsert replay leaves the usage count unchanged", async () => {
		const context = harness()
		const body = { usage: [usageRow()] }
		await post(context, body)
		await post(context, body)
		expect(count(context, "usage_hourly")).toBe(1)
		expect(count(context, "rollup_daily")).toBe(1)
		expect(count(context, "ingest_log")).toBe(2)
	})

	test("reports a storage failure as 500 and writes nothing", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		const failing = {
			...context.env,
			DB: {
				prepare: context.env.DB.prepare.bind(context.env.DB),
				batch: async () => {
					throw new Error("storage down")
				},
			} as unknown as D1Database,
		}
		const response = await handleRequest(ingestRequest({ usage: [usageRow()] }), failing, {
			nowMs: NOW_MS,
		})
		expect(response.status).toBe(500)
		expect(count(context, "usage_hourly")).toBe(0)
		restore()
	})

	test("accepts POST only", async () => {
		const context = harness()
		const response = await handleRequest(get("/ingest"), context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(405)
		expect(response.headers.get("allow")).toBe("POST")
	})
})
