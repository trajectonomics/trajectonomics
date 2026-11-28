import { beforeAll, describe, expect, test } from "bun:test"
import { sha256Hex } from "../src/core/hash"
import { ME_PATH, SIGN_OUT_PATH, SITE_ORIGIN } from "../src/core/urls"
import {
	base64url,
	OAUTH_COOKIE,
	SESSION_COOKIE,
	WEB_CALLBACK_URL,
	WEB_CLIENT_ID,
} from "../src/core/web-auth"
import { handleRequest } from "../src/http/router"
import { NOW_MS, TEST_ISSUER } from "./support/fixtures"
import { harness } from "./support/http"
import { type TestSigner, testSigner } from "./support/token"
import { cookieFrom, count, oauthCookie, seedSession, setCookies } from "./support/web-auth"
import {
	type Capture,
	CLEARED_OAUTH,
	callback,
	startSignIn,
	tokenFetch,
} from "./support/web-auth-callback"

let signer: TestSigner

beforeAll(async () => {
	signer = await testSigner()
})

describe("GET /data/auth/sign-in", () => {
	test("answers the PKCE authorize URL and its short-lived cookie", async () => {
		const context = harness()
		const { response, state, verifier } = await startSignIn(context)
		expect(response.status).toBe(302)
		expect(response.headers.get("cache-control")).toBe("no-store")
		const location = new URL(response.headers.get("location") ?? "")
		expect(`${location.origin}${location.pathname}`).toBe(
			`${TEST_ISSUER}/api/auth/oauth2/authorize`,
		)
		expect(location.searchParams.get("client_id")).toBe(WEB_CLIENT_ID)
		expect(location.searchParams.get("redirect_uri")).toBe(WEB_CALLBACK_URL)
		expect(location.searchParams.get("response_type")).toBe("code")
		expect(location.searchParams.get("scope")).toBe("openid")
		expect(location.searchParams.get("code_challenge_method")).toBe("S256")
		expect(location.searchParams.get("state")).toBe(state)
		expect(location.searchParams.get("resource")).toBe("https://trajectonomics.com/data")
		const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
		expect(location.searchParams.get("code_challenge")).toBe(base64url(new Uint8Array(digest)))
		expect(setCookies(response)).toEqual([
			`${OAUTH_COOKIE}=${state}.${verifier}; Path=/data/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
		])
	})
})

describe("GET /data/auth/callback", () => {
	test("exchanges the code, verifies the token and starts a hashed session", async () => {
		const context = harness()
		const { state, verifier } = await startSignIn(context)
		const capture: Capture = {}
		const token = await signer.sign({ sub: "user-synthetic-1", scope: null })
		const response = await callback(context, signer.jwks, {
			state,
			cookie: oauthCookie(state, verifier),
			authFetch: tokenFetch(token, capture),
		})
		expect(response.status).toBe(303)
		expect(response.headers.get("location")).toBe(ME_PATH)
		expect(response.headers.get("cache-control")).toBe("no-store")
		const cookies = setCookies(response)
		expect(cookies).toHaveLength(2)
		expect(cookies[0]).toBe(CLEARED_OAUTH)
		const sessionId = cookieFrom(response, SESSION_COOKIE)
		expect(sessionId).not.toBeNull()
		expect(cookies[1]).toBe(
			`${SESSION_COOKIE}=${sessionId}; Path=/data; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`,
		)
		const row = context.database.prepare("SELECT * FROM web_session").get() as {
			session_hash: string
			auth_user_id: string
			created_at: string
			expires_at: string
		}
		expect(row.session_hash).toBe(await sha256Hex(sessionId ?? ""))
		expect(row.auth_user_id).toBe("user-synthetic-1")
		expect(row.created_at).toBe(new Date(NOW_MS).toISOString())
		expect(row.expires_at).toBe(new Date(NOW_MS + 28_800_000).toISOString())
		expect(capture.url).toBe(`${TEST_ISSUER}/api/auth/oauth2/token`)
		expect(capture.init?.method).toBe("POST")
		expect(capture.init?.redirect).toBe("manual")
		expect(capture.init?.signal).toBeInstanceOf(AbortSignal)
		const headers = new Headers(capture.init?.headers)
		expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded")
		const form = new URLSearchParams(String(capture.init?.body))
		expect(Object.fromEntries(form)).toEqual({
			grant_type: "authorization_code",
			code: "synthetic-code",
			redirect_uri: WEB_CALLBACK_URL,
			client_id: WEB_CLIENT_ID,
			code_verifier: verifier,
			resource: "https://trajectonomics.com/data",
		})
	})
})

describe("POST /data/auth/sign-out", () => {
	function signOut(
		context: ReturnType<typeof harness>,
		origin: string | null,
		sessionId = "session-a",
	): Promise<Response> {
		const headers: Record<string, string> = { cookie: `${SESSION_COOKIE}=${sessionId}` }
		if (origin !== null) headers["origin"] = origin
		return handleRequest(
			new Request(`${SITE_ORIGIN}${SIGN_OUT_PATH}`, { method: "POST", headers }),
			context.env,
			{ nowMs: NOW_MS },
		)
	}

	test("refuses a missing or foreign origin and keeps the row", async () => {
		for (const origin of [null, "https://example.test"]) {
			const context = harness()
			await seedSession(context.database, "session-a", "user-synthetic-1")
			const response = await signOut(context, origin)
			expect(response.status).toBe(403)
			expect(await response.json()).toEqual({ error: "forbidden" })
			expect(count(context.database, "web_session")).toBe(1)
		}
	})

	test("deletes the row and clears the session cookie", async () => {
		const context = harness()
		await seedSession(context.database, "session-a", "user-synthetic-1")
		const response = await signOut(context, SITE_ORIGIN)
		expect(response.status).toBe(303)
		expect(response.headers.get("location")).toBe("/data/")
		expect(response.headers.get("cache-control")).toBe("no-store")
		expect(setCookies(response)).toEqual([
			`${SESSION_COOKIE}=; Path=/data; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
		])
		expect(count(context.database, "web_session")).toBe(0)
	})
})
