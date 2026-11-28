import { beforeAll, describe, expect, spyOn, test } from "bun:test"
import { sha256Hex } from "../src/core/hash"
import { INGEST_PATH, LEGACY_HOST, SITE_ORIGIN } from "../src/core/urls"
import type { Env } from "../src/env"
import type { JwksSource } from "../src/http/jwks"
import { handleRequest } from "../src/http/router"
import { NOW_MS, usageRow } from "./support/fixtures"
import { harness } from "./support/http"
import { failingJwks, fakeJwks } from "./support/jwks"
import { type TestSigner, testSigner } from "./support/token"

let signer: TestSigner

beforeAll(async () => {
	signer = await testSigner()
})

function request(token: string, body: unknown): Request {
	return new Request(`${SITE_ORIGIN}${INGEST_PATH}`, {
		method: "POST",
		headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
		body: JSON.stringify(body),
	})
}

async function post(
	context: ReturnType<typeof harness>,
	token: string,
	options: { jwks?: JwksSource; env?: Partial<Env>; body?: unknown } = {},
): Promise<Response> {
	const env = { ...context.env, ...options.env } as Env
	return handleRequest(request(token, options.body ?? { usage: [usageRow()] }), env, {
		nowMs: NOW_MS,
		jwks: options.jwks ?? { get: async () => ({ set: signer.jwks, fetched: false }) },
	})
}

function bindOrg(context: ReturnType<typeof harness>, sub: string): void {
	context.database
		.prepare("UPDATE contributor SET auth_user_id = ? WHERE id = 'trajectonomics'")
		.run(sub)
}

function orgBinding(context: ReturnType<typeof harness>): string | null {
	const row = context.database
		.prepare("SELECT auth_user_id FROM contributor WHERE id = 'trajectonomics'")
		.get() as { auth_user_id: string | null }
	return row.auth_user_id
}

function count(context: ReturnType<typeof harness>, table: string): number {
	const row = context.database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
	return row.n
}

describe("POST /ingest with an auth token", () => {
	test("a valid JWT for a bound org writes rows under trajectonomics", async () => {
		const context = harness()
		bindOrg(context, "auth-user-a")
		const response = await post(context, await signer.sign())
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ accepted: 1, days: ["2026-11-24"] })
		expect(count(context, "usage_hourly")).toBe(1)
		const row = context.database.prepare("SELECT contributor_id FROM usage_hourly").get() as {
			contributor_id: string
		}
		expect(row.contributor_id).toBe("trajectonomics")
	})

	test("the first token whose sub is the org secret binds the org row", async () => {
		const context = harness()
		const response = await post(context, await signer.sign(), {
			env: { ORG_AUTH_USER_ID: "auth-user-a" },
		})
		expect(response.status).toBe(200)
		expect(orgBinding(context)).toBe("auth-user-a")
		expect(count(context, "usage_hourly")).toBe(1)
	})

	test("once A binds the org, B's secret cannot bind it", async () => {
		const context = harness()
		bindOrg(context, "auth-user-a")
		const response = await post(context, await signer.sign({ sub: "auth-user-b" }), {
			env: { ORG_AUTH_USER_ID: "auth-user-b" },
		})
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({ error: "not_a_contributor" })
		expect(orgBinding(context)).toBe("auth-user-a")
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("an unknown sub is 403 not_a_contributor", async () => {
		const context = harness()
		const response = await post(context, await signer.sign({ sub: "stranger" }))
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({ error: "not_a_contributor" })
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("a tombstoned sub is 403 account_deleted", async () => {
		const context = harness()
		const sub = "deleted-user"
		const hash = await sha256Hex(sub)
		context.database
			.prepare("INSERT INTO contributor_tombstone (auth_user_hash, deleted_at) VALUES (?, ?)")
			.run(hash, new Date(NOW_MS).toISOString())
		const response = await post(context, await signer.sign({ sub }))
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({ error: "account_deleted" })
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("an unavailable JWKS is 503 auth_unavailable", async () => {
		const context = harness()
		const response = await post(context, await signer.sign(), { jwks: failingJwks() })
		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "auth_unavailable" })
		expect(count(context, "usage_hourly")).toBe(0)
	})

	test("an unknown kid refetches once, then succeeds with the new set", async () => {
		const context = harness()
		const fresh = await testSigner({ kid: "fresh-key" })
		bindOrg(context, "auth-user-a")
		const keys = fakeJwks(signer.jwks, fresh.jwks)
		const response = await post(context, await fresh.sign(), { jwks: keys })
		expect(response.status).toBe(200)
		expect(keys.calls()).toBe(2)
		expect(keys.refreshes()).toBe(1)
	})

	test("a bearer that is not a JWT is 401 on both hosts, even with the retired key variable set", async () => {
		const context = harness()
		const bearer = "synthetic-not-a-jwt"
		// The retired secret's name must not bring its value back into the auth path.
		const env = { ...context.env, INGEST_BOOTSTRAP_KEY: bearer } as unknown as Env
		const logged = spyOn(console, "error").mockImplementation(() => {})
		const apex = await handleRequest(request(bearer, { usage: [usageRow()] }), env, {
			nowMs: NOW_MS,
		})
		expect(apex.status).toBe(401)
		expect(await apex.json()).toEqual({ error: "unauthorized" })
		const old = await handleRequest(
			new Request(`https://${LEGACY_HOST}/ingest`, {
				method: "POST",
				headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
				body: JSON.stringify({ usage: [usageRow()] }),
			}),
			env,
			{ nowMs: NOW_MS },
		)
		expect(old.status).toBe(401)
		expect(await old.json()).toEqual({ error: "unauthorized" })
		expect(count(context, "usage_hourly")).toBe(0)
		expect(logged).not.toHaveBeenCalled()
		logged.mockRestore()
	})

	test("a JWT ingest makes at most two D1 calls", async () => {
		const context = harness({ maxCalls: 2 })
		bindOrg(context, "auth-user-a")
		const response = await post(context, await signer.sign())
		expect(response.status).toBe(200)
		expect(context.calls()).toBe(2)
	})

	test("a storage failure during the sender read is 500, not 401", async () => {
		const context = harness()
		const restore = spyOn(console, "error").mockImplementation(() => {})
		const failing = {
			...context.env,
			DB: {
				prepare: () => {
					throw new Error("storage down")
				},
			} as never,
		}
		const response = await post(context, await signer.sign(), { env: failing })
		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({ error: "storage_error" })
		restore()
	})
})
