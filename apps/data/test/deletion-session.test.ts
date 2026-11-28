import type { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { INTERNAL_HOST } from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_MS } from "./support/fixtures"
import { harness } from "./support/http"
import { seedSession } from "./support/web-auth"

function deletion(context: ReturnType<typeof harness>, authUserId: string): Promise<Response> {
	return handleRequest(
		new Request(`https://${INTERNAL_HOST}/internal/contributors/delete`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ authUserId }),
		}),
		context.env,
		{ nowMs: NOW_MS },
	)
}

function sessions(database: Database): string[] {
	const rows = database
		.prepare("SELECT auth_user_id FROM web_session ORDER BY auth_user_id")
		.all() as { auth_user_id: string }[]
	return rows.map((row) => row.auth_user_id)
}

describe("a deletion and the web sessions", () => {
	test("removes that user's sessions and keeps another user's", async () => {
		const context = harness()
		await seedSession(context.database, "session-a", "user-synthetic-1")
		await seedSession(context.database, "session-b", "user-synthetic-2")
		const response = await deletion(context, "user-synthetic-1")
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ deleted: true })
		expect(sessions(context.database)).toEqual(["user-synthetic-2"])
	})

	test("keeps the deletion one batched D1 call", async () => {
		const context = harness()
		await seedSession(context.database, "session-a", "user-synthetic-1")
		const before = context.calls()
		expect((await deletion(context, "user-synthetic-1")).status).toBe(200)
		expect(context.calls() - before).toBe(1)
	})
})
