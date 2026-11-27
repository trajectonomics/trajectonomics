import { describe, expect, test } from "bun:test"
import { routeRequest } from "../src/core/route"
import { handleRequest } from "../src/http/router"
import { NOW_MS, TEST_KEY, usageRow } from "./support/fixtures"
import { get, harness, ingestRequest, legacy } from "./support/http"
import { silenceConsoleError } from "./support/log"
import { failingEnv } from "./support/usage"

const APEX = "trajectonomics.com"
const OLD = "data.trajectonomics.com"

function at(
	hostname: string,
	pathname: string,
	options: { method?: string; search?: string } = {},
) {
	return routeRequest({
		hostname,
		pathname,
		search: options.search ?? "",
		method: options.method ?? "GET",
	})
}

describe("routeRequest on the apex", () => {
	test("sends /data/api/* and /data/ingest to their handlers", () => {
		expect(at(APEX, "/data/api/usage")).toEqual({ kind: "usage" })
		expect(at(APEX, "/data/api/peaks")).toEqual({ kind: "peaks" })
		expect(at(APEX, "/data/api/health")).toEqual({ kind: "health" })
		expect(at(APEX, "/data/ingest", { method: "POST" })).toEqual({ kind: "ingest" })
	})

	test("leaves the pages to the assets binding and answers a miss under /data/ with 404", () => {
		expect(at(APEX, "/data/")).toEqual({ kind: "not_found" })
		expect(at(APEX, "/data/method/")).toEqual({ kind: "not_found" })
	})

	test("does not answer the old bare paths on the apex", () => {
		expect(at(APEX, "/api/usage")).toEqual({ kind: "not_found" })
		expect(at(APEX, "/ingest", { method: "POST" })).toEqual({ kind: "not_found" })
	})
})

describe("routeRequest on the old host", () => {
	test("keeps the API and ingest, without redirecting", () => {
		expect(at(OLD, "/api/usage")).toEqual({ kind: "usage" })
		expect(at(OLD, "/api/peaks")).toEqual({ kind: "peaks" })
		expect(at(OLD, "/api/health")).toEqual({ kind: "health" })
		expect(at(OLD, "/api/nope")).toEqual({ kind: "not_found" })
		expect(at(OLD, "/ingest", { method: "POST" })).toEqual({ kind: "ingest" })
	})

	test("answers the API and ingest under the base too, which a page served there calls", () => {
		expect(at(OLD, "/data/api/usage")).toEqual({ kind: "usage" })
		expect(at(OLD, "/data/api/peaks")).toEqual({ kind: "peaks" })
		expect(at(OLD, "/data/api/health")).toEqual({ kind: "health" })
		expect(at(OLD, "/data/ingest", { method: "POST" })).toEqual({ kind: "ingest" })
	})

	test("redirects the root to the data root", () => {
		expect(at(OLD, "/")).toEqual({
			kind: "redirect",
			location: "https://trajectonomics.com/data/",
		})
	})

	test("redirects the method page", () => {
		expect(at(OLD, "/method/")).toEqual({
			kind: "redirect",
			location: "https://trajectonomics.com/data/method/",
		})
	})

	test("keeps the query string", () => {
		expect(at(OLD, "/method/", { search: "?asOf=2026-11-24" })).toEqual({
			kind: "redirect",
			location: "https://trajectonomics.com/data/method/?asOf=2026-11-24",
		})
	})

	test("does not prefix a path that already has the base", () => {
		expect(at(OLD, "/data/nowhere", { search: "?asOf=2026-11-24" })).toEqual({
			kind: "redirect",
			location: "https://trajectonomics.com/data/nowhere?asOf=2026-11-24",
		})
	})

	test("normalises the base without its trailing slash", () => {
		expect(at(OLD, "/data")).toEqual({
			kind: "redirect",
			location: "https://trajectonomics.com/data/",
		})
	})

	test("redirects HEAD as well as GET", () => {
		expect(at(OLD, "/", { method: "HEAD" })).toEqual({
			kind: "redirect",
			location: "https://trajectonomics.com/data/",
		})
	})

	test("refuses a non-GET method on a page", () => {
		expect(at(OLD, "/method/", { method: "POST" })).toEqual({
			kind: "method_not_allowed",
			allow: "GET, HEAD",
		})
	})
})

describe("routeRequest on localhost", () => {
	test("serves the new addresses and never redirects", () => {
		expect(at("localhost", "/data/")).toEqual({ kind: "not_found" })
		expect(at("localhost", "/data/api/health")).toEqual({ kind: "health" })
		expect(at("127.0.0.1", "/data/api/usage")).toEqual({ kind: "usage" })
		expect(at("127.0.0.1", "/data/api/peaks")).toEqual({ kind: "peaks" })
	})
})

describe("the router over HTTP", () => {
	test("answers the apex API and ingest addresses", async () => {
		const context = harness()
		const contextOptions = { nowMs: NOW_MS, cache: context.cache }
		const seeded = await handleRequest(
			ingestRequest({ usage: [usageRow()] }),
			context.env,
			contextOptions,
		)
		expect(seeded.status).toBe(200)
		expect(await seeded.json()).toEqual({ accepted: 1, days: ["2026-11-24"] })

		const health = await handleRequest(get("/api/health"), context.env, contextOptions)
		expect(health.status).toBe(200)
		const usage = await handleRequest(
			get("/api/usage?from=2026-11-24"),
			context.env,
			contextOptions,
		)
		expect(usage.status).toBe(200)
	})

	test("answers the old host's API and POST ingest without redirecting", async () => {
		const context = harness()
		const contextOptions = { nowMs: NOW_MS, cache: context.cache }
		const seeded = await handleRequest(
			legacy("/ingest", {
				method: "POST",
				headers: { authorization: `Bearer ${TEST_KEY}`, "content-type": "application/json" },
				body: JSON.stringify({ usage: [usageRow()] }),
			}),
			context.env,
			contextOptions,
		)
		expect(seeded.status).toBe(200)
		expect(seeded.headers.get("location")).toBeNull()
		expect(await seeded.json()).toEqual({ accepted: 1, days: ["2026-11-24"] })

		const health = await handleRequest(legacy("/api/health"), context.env, contextOptions)
		expect(health.status).toBe(200)
		expect(health.headers.get("location")).toBeNull()

		const usage = await handleRequest(
			legacy("/api/usage?from=2026-11-24"),
			context.env,
			contextOptions,
		)
		expect(usage.status).toBe(200)
		expect(usage.headers.get("location")).toBeNull()
	})

	test("redirects an old-host page GET with its query string", async () => {
		const context = harness()
		const response = await handleRequest(legacy("/method/?asOf=2026-11-24"), context.env, {
			nowMs: NOW_MS,
		})
		expect(response.status).toBe(301)
		expect(response.headers.get("location")).toBe(
			"https://trajectonomics.com/data/method/?asOf=2026-11-24",
		)
	})

	test("answers a miss under /data/ with 404", async () => {
		const context = harness()
		const response = await handleRequest(get("/nope"), context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(404)
	})

	test("serves a copy cached from the old host on the apex", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await handleRequest(ingestRequest({ usage: [usageRow()] }), context.env, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		const first = await handleRequest(legacy("/api/usage?from=2026-11-24"), context.env, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(first.status).toBe(200)
		const body = await first.text()
		const second = await handleRequest(get("/api/usage?from=2026-11-24"), failingEnv(context), {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(body)
		restore()
	})

	test("never redirects a page on localhost", async () => {
		const context = harness()
		const response = await handleRequest(
			new Request("http://localhost:8787/method/"),
			context.env,
			{
				nowMs: NOW_MS,
			},
		)
		expect(response.status).toBe(404)
		expect(response.headers.get("location")).toBeNull()
	})
})
