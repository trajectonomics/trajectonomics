import type { JSONWebKeySet } from "jose"
import { CALLBACK_PATH, SIGN_IN_PATH, SITE_ORIGIN } from "../../src/core/urls"
import { OAUTH_COOKIE, parseOauthCookie } from "../../src/core/web-auth"
import type { JwksSource } from "../../src/http/jwks"
import { handleRequest } from "../../src/http/router"
import { NOW_MS } from "./fixtures"
import type { Harness } from "./http"
import { cookieFrom, oauthCookie, testRandom } from "./web-auth"

export const STATE = "s".repeat(43)
export const VERIFIER = "v".repeat(43)
export const CLEARED_OAUTH = `${OAUTH_COOKIE}=; Path=/data/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`

export type Capture = { url?: string; init?: RequestInit | undefined }

/** A fake auth token endpoint answering one token and recording the request it received. */
export function tokenFetch(token: string, capture: Capture = {}): typeof fetch {
	const fake = async (input: string | URL | Request, init?: RequestInit) => {
		capture.url = String(input)
		capture.init = init
		return Response.json({
			access_token: token,
			id_token: "ignored",
			refresh_token: "ignored",
		})
	}
	return fake as unknown as typeof fetch
}

/** Starts the real sign-in and returns the state and verifier it put in the OAuth cookie. */
export async function startSignIn(context: Harness) {
	const response = await handleRequest(new Request(`${SITE_ORIGIN}${SIGN_IN_PATH}`), context.env, {
		nowMs: NOW_MS,
		random: testRandom(3),
	})
	const parsed = parseOauthCookie(cookieFrom(response, OAUTH_COOKIE))
	if (parsed === null) throw new Error("the sign-in did not set an OAuth cookie")
	return { response, ...parsed }
}

/** A callback request carrying the OAuth cookie, with one failure injectable per call. */
export function callback(
	context: Harness,
	keys: JSONWebKeySet,
	options: {
		state?: string
		cookie?: string | null
		code?: string | null
		error?: string
		jwks?: JwksSource
		authFetch?: typeof fetch
		random?: (length: number) => Uint8Array
	} = {},
): Promise<Response> {
	const params = new URLSearchParams({ state: options.state ?? STATE })
	if (options.code !== null) params.set("code", options.code ?? "synthetic-code")
	if (options.error !== undefined) params.set("error", options.error)
	const cookie = options.cookie === undefined ? oauthCookie(STATE, VERIFIER) : options.cookie
	const jwks: JwksSource = options.jwks ?? {
		get: async () => ({ set: keys, fetched: false }),
	}
	return handleRequest(
		new Request(`${SITE_ORIGIN}${CALLBACK_PATH}?${params.toString()}`, {
			headers: cookie === null ? {} : { cookie },
		}),
		context.env,
		{
			nowMs: NOW_MS,
			jwks,
			random: options.random ?? testRandom(9),
			...(options.authFetch === undefined ? {} : { authFetch: options.authFetch }),
		},
	)
}
