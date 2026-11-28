import { beforeAll, describe, expect, test } from "bun:test"
import { INGEST_PATH, LEGACY_HOST, SITE_ORIGIN } from "../src/core/urls"
import type { Env } from "../src/env"
import {
	createJwksSource,
	type JwksResult,
	type JwksSource,
	JwksUnavailableError,
} from "../src/http/jwks"
import { handleRequest } from "../src/http/router"
import { NOW_MS, usageRow } from "./support/fixtures"
import { harness } from "./support/http"
import { fakeJwks } from "./support/jwks"
import { type TestSigner, TOKEN_NOW_SECONDS, testSigner } from "./support/token"

let signer: TestSigner

beforeAll(async () => {
	signer = await testSigner()
})

/** A source that serves the test key set and runs `refreshed` when a refresh is asked. */
function refreshing(refreshed: () => Promise<JwksResult>): JwksSource {
	return {
		async get(_issuer, _nowMs, options = {}) {
			if (options.refresh === true) return refreshed()
			return { set: signer.jwks, fetched: false }
		},
	}
}

function post(
	context: ReturnType<typeof harness>,
	token: string,
	options: { jwks?: JwksSource; env?: Partial<Env>; body?: unknown; url?: string } = {},
): Promise<Response> {
	const env = { ...context.env, ...options.env } as Env
	const fallback: JwksSource = { get: async () => ({ set: signer.jwks, fetched: false }) }
	return handleRequest(
		new Request(options.url ?? `${SITE_ORIGIN}${INGEST_PATH}`, {
			method: "POST",
			headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
			body: JSON.stringify(options.body ?? { usage: [usageRow()] }),
		}),
		env,
		{ nowMs: NOW_MS, jwks: options.jwks ?? fallback },
	)
}

function orgBinding(context: ReturnType<typeof harness>): string | null {
	const row = context.database
		.prepare("SELECT auth_user_id FROM contributor WHERE id = 'trajectonomics'")
		.get() as { auth_user_id: string | null }
	return row.auth_user_id
}

function bindOrg(context: ReturnType<typeof harness>, sub: string): void {
	context.database
		.prepare("UPDATE contributor SET auth_user_id = ? WHERE id = 'trajectonomics'")
		.run(sub)
}

function count(context: ReturnType<typeof harness>, table: string): number {
	const row = context.database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
	return row.n
}

describe("ingest with a token auth refuses", () => {
	test("an expired token is 401, not 503", async () => {
		const context = harness()
		const token = await signer.sign({
			iat: TOKEN_NOW_SECONDS - 600,
			exp: TOKEN_NOW_SECONDS - 31,
		})
		const response = await post(context, token)
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "unauthorized" })
	})

	test("a bad signature is 401", async () => {
		const context = harness()
		const impostor = await testSigner()
		const response = await post(context, await impostor.sign())
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "unauthorized" })
	})

	test("a kid still unknown after a real refetch is 401", async () => {
		const context = harness()
		const rotated = await testSigner({ kid: "rotated-key" })
		const keys = fakeJwks(signer.jwks)
		const response = await post(context, await rotated.sign(), { jwks: keys })
		expect(response.status).toBe(401)
		expect(keys.refreshes()).toBe(1)
	})

	test("a kid missing from a set fetched by this request is 401 after one fetch", async () => {
		const context = harness()
		let fetches = 0
		const cold = createJwksSource(async () => {
			fetches += 1
			return Response.json(signer.jwks)
		})
		const rotated = await testSigner({ kid: "never-published" })
		const response = await post(context, await rotated.sign(), { jwks: cold })
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "unauthorized" })
		expect(fetches).toBe(1)
	})
})

describe("ingest when the key set cannot be refreshed", () => {
	test("a refresh that throws is 503", async () => {
		const context = harness()
		const rotated = await testSigner({ kid: "rotated-key" })
		const jwks = refreshing(async () => {
			throw new JwksUnavailableError()
		})
		const response = await post(context, await rotated.sign(), { jwks })
		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "auth_unavailable" })
	})

	test("a suppressed refresh is 503, not 401", async () => {
		const context = harness()
		const rotated = await testSigner({ kid: "rotated-key" })
		const jwks = refreshing(async () => ({ set: signer.jwks, fetched: false }))
		const response = await post(context, await rotated.sign(), { jwks })
		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "auth_unavailable" })
	})
})

describe("the owner's first token", () => {
	test("an invalid batch answers 400 and leaves the org unbound", async () => {
		const context = harness()
		const response = await post(context, await signer.sign(), {
			env: { ORG_AUTH_USER_ID: "auth-user-a" },
			body: {},
		})
		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			error: "invalid_batch",
			errors: [{ path: "", code: "EMPTY_BATCH", message: "The batch carries no rows." }],
		})
		expect(orgBinding(context)).toBeNull()
		expect(count(context, "usage_hourly")).toBe(0)
	})
})

describe("the old host", () => {
	test("accepts a JWT ingest and writes its rows", async () => {
		const context = harness()
		bindOrg(context, "auth-user-a")
		const response = await post(context, await signer.sign(), {
			url: `https://${LEGACY_HOST}/ingest`,
		})
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ accepted: 1, days: ["2026-11-24"] })
		expect(count(context, "usage_hourly")).toBe(1)
	})
})
