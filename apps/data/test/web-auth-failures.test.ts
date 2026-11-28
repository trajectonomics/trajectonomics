import { beforeAll, describe, expect, spyOn, test } from "bun:test"
import { sha256Hex } from "../src/core/hash"
import { ME_PATH } from "../src/core/urls"
import { SESSION_COOKIE } from "../src/core/web-auth"
import { harness } from "./support/http"
import { failingJwks } from "./support/jwks"
import { type TestSigner, TOKEN_NOW_SECONDS, testSigner } from "./support/token"
import { cookieFrom, count, oauthCookie, seedSession, setCookies } from "./support/web-auth"
import { CLEARED_OAUTH, callback, startSignIn, tokenFetch } from "./support/web-auth-callback"

let signer: TestSigner

beforeAll(async () => {
	signer = await testSigner()
})

const FAILED_LOCATION = `${ME_PATH}?signin=failed`

describe("the callback's failures", () => {
	const failures: [string, (context: ReturnType<typeof harness>) => Promise<Response>][] = [
		["a missing cookie", (context) => callback(context, signer.jwks, { cookie: null })],
		["a state mismatch", (context) => callback(context, signer.jwks, { state: "t".repeat(43) })],
		["an error query", (context) => callback(context, signer.jwks, { error: "access_denied" })],
		["a missing code", (context) => callback(context, signer.jwks, { code: null })],
		[
			"a token endpoint 500",
			(context) =>
				callback(context, signer.jwks, {
					authFetch: (async () => new Response(null, { status: 500 })) as unknown as typeof fetch,
				}),
		],
		[
			"a token endpoint throw",
			(context) =>
				callback(context, signer.jwks, {
					authFetch: (async () => {
						throw new Error("down")
					}) as unknown as typeof fetch,
				}),
		],
		[
			"a token without an access token",
			(context) =>
				callback(context, signer.jwks, {
					authFetch: (async () =>
						Response.json({ id_token: "ignored" })) as unknown as typeof fetch,
				}),
		],
		[
			"a token endpoint that answers no JSON",
			(context) =>
				callback(context, signer.jwks, {
					authFetch: (async () => new Response("not json")) as unknown as typeof fetch,
				}),
		],
		[
			"a token endpoint that answers null",
			(context) =>
				callback(context, signer.jwks, {
					authFetch: (async () => Response.json(null)) as unknown as typeof fetch,
				}),
		],
		[
			"a token signed with the wrong key",
			async (context) => {
				const impostor = await testSigner({ kid: "impostor-key" })
				return callback(context, signer.jwks, {
					authFetch: tokenFetch(await impostor.sign({ scope: null })),
				})
			},
		],
		[
			"a token with the wrong aud",
			async (context) =>
				callback(context, signer.jwks, {
					authFetch: tokenFetch(
						await signer.sign({ audience: "https://example.test/other", scope: null }),
					),
				}),
		],
		[
			"a deleted user, whose tombstone refuses the sign-in",
			async (context) => {
				context.database
					.prepare("INSERT INTO contributor_tombstone (auth_user_hash, deleted_at) VALUES (?, ?)")
					.run(await sha256Hex("user-deleted"), "2026-11-25T11:00:00.000Z")
				return callback(context, signer.jwks, {
					authFetch: tokenFetch(await signer.sign({ sub: "user-deleted", scope: null })),
				})
			},
		],
		[
			"a token endpoint that redirects",
			(context) =>
				callback(context, signer.jwks, {
					authFetch: (async () =>
						new Response(null, {
							status: 302,
							headers: { location: "https://example.test/" },
						})) as unknown as typeof fetch,
				}),
		],
		[
			"a token from another issuer",
			async (context) =>
				callback(context, signer.jwks, {
					authFetch: tokenFetch(await signer.sign({ issuer: "https://example.test", scope: null })),
				}),
		],
		[
			"an expired token",
			async (context) =>
				callback(context, signer.jwks, {
					authFetch: tokenFetch(await signer.sign({ iat: TOKEN_NOW_SECONDS - 2000, scope: null })),
				}),
		],
		[
			"an unavailable key set",
			async (context) =>
				callback(context, signer.jwks, {
					jwks: failingJwks(),
					authFetch: tokenFetch(await signer.sign({ scope: null })),
				}),
		],
	]

	test.each(failures)("fails for %s and clears the OAuth cookie", async (_name, run) => {
		const logged = spyOn(console, "error").mockImplementation(() => {})
		const context = harness()
		const response = await run(context).finally(() => logged.mockRestore())
		expect(response.status).toBe(303)
		expect(response.headers.get("location")).toBe(FAILED_LOCATION)
		expect(setCookies(response)).toEqual([CLEARED_OAUTH])
		expect(count(context.database, "web_session")).toBe(0)
	})

	test("purges an expired session on the next sign-in", async () => {
		const context = harness()
		await seedSession(
			context.database,
			"expired-session",
			"user-synthetic-0",
			"2026-11-25T11:00:00.000Z",
		)
		const { state, verifier } = await startSignIn(context)
		const response = await callback(context, signer.jwks, {
			state,
			cookie: oauthCookie(state, verifier),
			authFetch: tokenFetch(await signer.sign({ scope: null })),
		})
		expect(response.status).toBe(303)
		expect(response.headers.get("location")).toBe(ME_PATH)
		const sessionId = cookieFrom(response, SESSION_COOKIE) ?? ""
		const rows = context.database.prepare("SELECT session_hash FROM web_session").all() as {
			session_hash: string
		}[]
		expect(rows).toEqual([{ session_hash: await sha256Hex(sessionId) }])
	})
})
