import { describe, expect, spyOn, test } from "bun:test"
import { COLLECTORS_PATH, SIGN_OUT_PATH, SITE_ORIGIN } from "../src/core/urls"
import { SESSION_COOKIE } from "../src/core/web-auth"
import { handleRequest } from "../src/http/router"
import { NOW_MS } from "./support/fixtures"
import { harness } from "./support/http"
import { seedSession, seedUsage, setCookies } from "./support/web-auth"

function request(
	context: ReturnType<typeof harness>,
	path: string,
	sessionId: string,
	init: RequestInit = {},
): Promise<Response> {
	const headers = {
		...(init.headers as Record<string, string>),
		cookie: `${SESSION_COOKIE}=${sessionId}`,
	}
	return handleRequest(new Request(`${SITE_ORIGIN}${path}`, { ...init, headers }), context.env, {
		nowMs: NOW_MS,
	})
}

async function machines(context: ReturnType<typeof harness>, sessionId: string): Promise<string[]> {
	const response = await request(context, COLLECTORS_PATH, sessionId)
	expect(response.status).toBe(200)
	const body = (await response.json()) as { collectors: { machine: string }[] }
	return body.collectors.map((collector) => collector.machine)
}

describe("one user's collectors", () => {
	test("never include another contributor's machines", async () => {
		const context = harness()
		context.database
			.prepare("UPDATE contributor SET auth_user_id = ? WHERE id = 'trajectonomics'")
			.run("user-synthetic-1")
		context.database
			.prepare(
				"INSERT INTO contributor (id, auth_user_id, handle, kind, created_at) VALUES (?, ?, NULL, 'community', ?)",
			)
			.run("community-b", "user-synthetic-2", "2026-11-20T00:00:00.000Z")
		seedUsage(
			context.database,
			"trajectonomics",
			"machine-a",
			"2026-11-25T00:00:00.000Z",
			"2026-11-25T01:00:00.000Z",
		)
		seedUsage(
			context.database,
			"community-b",
			"machine-b",
			"2026-11-25T00:00:00.000Z",
			"2026-11-25T01:00:00.000Z",
		)
		await seedSession(context.database, "session-a", "user-synthetic-1")
		await seedSession(context.database, "session-b", "user-synthetic-2")
		await seedSession(context.database, "session-c", "user-synthetic-3")
		expect(await machines(context, "session-a")).toEqual(["machine-a"])
		expect(await machines(context, "session-b")).toEqual(["machine-b"])
		expect(await machines(context, "session-c")).toEqual([])
	})
})

describe("a sign-out D1 cannot finish", () => {
	test("keeps the cookie and sends the person back to try again", async () => {
		const logged = spyOn(console, "error").mockImplementation(() => {})
		let response: Response
		try {
			const context = harness({ maxCalls: 0 })
			response = await request(context, SIGN_OUT_PATH, "session-a", {
				method: "POST",
				headers: { origin: SITE_ORIGIN },
			})
			expect(logged).toHaveBeenCalled()
		} finally {
			logged.mockRestore()
		}
		expect(response.status).toBe(303)
		expect(response.headers.get("location")).toBe("/data/me/?signout=failed")
		expect(setCookies(response)).toEqual([])
	})
})
