import { describe, expect, test } from "bun:test"
import { COLLECTORS_PATH, SITE_ORIGIN } from "../src/core/urls"
import { clearCookie, SESSION_COOKIE } from "../src/core/web-auth"
import { handleRequest } from "../src/http/router"
import { NOW_MS } from "./support/fixtures"
import { harness } from "./support/http"
import { count, seedSession, seedUsage, setCookies } from "./support/web-auth"

const NO_STORE = "private, no-store"

function me(context: ReturnType<typeof harness>, sessionId: string | null): Promise<Response> {
	const headers = sessionId === null ? {} : { cookie: `${SESSION_COOKIE}=${sessionId}` }
	return handleRequest(new Request(`${SITE_ORIGIN}${COLLECTORS_PATH}`, { headers }), context.env, {
		nowMs: NOW_MS,
	})
}

function clearedSession(): string {
	return clearCookie(SESSION_COOKIE, "/data")
}

describe("GET /data/api/me/collectors", () => {
	test("answers 401 with no D1 call when there is no session cookie", async () => {
		const context = harness()
		const response = await me(context, null)
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "signed_out" })
		expect(response.headers.get("cache-control")).toBe(NO_STORE)
		expect(context.calls()).toBe(0)
		expect(setCookies(response)).toEqual([])
	})

	test("answers 401 and clears an unknown session's cookie", async () => {
		const context = harness()
		const response = await me(context, "unknown-session")
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "signed_out" })
		expect(response.headers.get("cache-control")).toBe(NO_STORE)
		expect(setCookies(response)).toEqual([clearedSession()])
	})

	test("answers 401 and clears an expired session's cookie", async () => {
		const context = harness()
		await seedSession(
			context.database,
			"expired-session",
			"user-synthetic-1",
			"2026-11-25T11:00:00.000Z",
		)
		const response = await me(context, "expired-session")
		expect(response.status).toBe(401)
		expect(setCookies(response)).toEqual([clearedSession()])
	})

	test("lists the bound contributor's machines in one batch", async () => {
		const context = harness()
		context.database
			.prepare("UPDATE contributor SET auth_user_id = ? WHERE id = 'trajectonomics'")
			.run("user-synthetic-1")
		await seedSession(context.database, "session-a", "user-synthetic-1")
		seedUsage(
			context.database,
			"trajectonomics",
			"machine-a",
			"2026-11-24T00:00:00.000Z",
			"2026-11-25T10:00:00.000Z",
		)
		seedUsage(
			context.database,
			"trajectonomics",
			"machine-a",
			"2026-11-25T00:00:00.000Z",
			"2026-11-25T12:00:00.000Z",
		)
		seedUsage(
			context.database,
			"trajectonomics",
			"machine-b",
			"2026-11-20T00:00:00.000Z",
			"2026-11-20T01:00:00.000Z",
		)
		const before = context.batches().length
		const response = await me(context, "session-a")
		expect(response.status).toBe(200)
		expect(response.headers.get("cache-control")).toBe(NO_STORE)
		const body = await response.text()
		expect(body).not.toContain("user-synthetic-1")
		expect(JSON.parse(body)).toEqual({
			collectors: [
				{
					machine: "machine-a",
					firstDay: "2026-11-24",
					lastDay: "2026-11-25",
					rows: 2,
					lastSendAt: "2026-11-25T12:00:00.000Z",
				},
				{
					machine: "machine-b",
					firstDay: "2026-11-20",
					lastDay: "2026-11-20",
					rows: 1,
					lastSendAt: "2026-11-20T01:00:00.000Z",
				},
			],
		})
		expect(context.batches().length - before).toBe(1)
		expect(context.batches().at(-1)).toHaveLength(2)
	})

	test("lists nothing for a signed-in user with no contributor", async () => {
		const context = harness()
		await seedSession(context.database, "session-b", "user-synthetic-2")
		const response = await me(context, "session-b")
		expect(response.status).toBe(200)
		expect(response.headers.get("cache-control")).toBe(NO_STORE)
		expect(await response.json()).toEqual({ collectors: [] })
	})

	test("never answers from or writes to a public cache", async () => {
		const context = harness()
		const before = count(context.database, "rollup_daily")
		await me(context, null)
		await me(context, "unknown-session")
		expect(count(context.database, "rollup_daily")).toBe(before)
		expect(context.cache.entries.size).toBe(0)
	})
})
