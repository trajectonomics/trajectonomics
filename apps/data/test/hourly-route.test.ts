import { describe, expect, test } from "bun:test"
import { routeRequest } from "../src/core/route"
import { handleRequest } from "../src/http/router"
import { NOW_MS } from "./support/fixtures"
import { get, harness, legacy } from "./support/http"

const APEX = "trajectonomics.com"
const OLD = "data.trajectonomics.com"

function at(hostname: string, pathname: string) {
	return routeRequest({ hostname, pathname, search: "", method: "GET" })
}

describe("the hourly read's route", () => {
	test("answers under the base path on the apex", () => {
		expect(at(APEX, "/data/api/usage/hourly")).toEqual({ kind: "usage_hourly" })
	})

	test("answers the old host's bare and base paths", () => {
		expect(at(OLD, "/api/usage/hourly")).toEqual({ kind: "usage_hourly" })
		expect(at(OLD, "/data/api/usage/hourly")).toEqual({ kind: "usage_hourly" })
	})

	test("answers a local host under the base path", () => {
		expect(at("127.0.0.1", "/data/api/usage/hourly")).toEqual({ kind: "usage_hourly" })
		expect(at(APEX, "/api/usage/hourly")).toEqual({ kind: "not_found" })
		expect(at(APEX, "/data/api/usage/hourly/extra")).toEqual({ kind: "not_found" })
	})

	test("reaches the handler through the router", async () => {
		const context = harness()
		const response = await handleRequest(get("/api/usage/hourly"), context.env, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(response.status).toBe(200)
		const old = await handleRequest(legacy("/api/usage/hourly"), context.env, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(old.status).toBe(200)
		expect(old.headers.get("location")).toBeNull()
	})
})
