/** The only module that creates and calls the Better Auth client, so plugins live in one place. */
import {
	oauthDeviceAuthorizationClient,
	oauthProviderClient,
} from "@better-auth/oauth-provider/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { createAuthClient } from "better-auth/svelte"
import type {
	ConsentLanguage,
	ConsentSource,
	ConsentState,
	MarketingConsent,
	SessionResponse,
} from "../lib/api-types"
import { AuthRequestError } from "./errors"

function makeClient() {
	return createAuthClient({
		plugins: [passkeyClient(), oauthProviderClient(), oauthDeviceAuthorizationClient()],
	})
}

type AuthClient = ReturnType<typeof makeClient>
let instance: AuthClient | undefined

function auth(): AuthClient {
	instance ??= makeClient()
	return instance
}

/** One typed request; a transport or API error becomes an `AuthRequestError`. */
export async function request<T>(
	path: string,
	options: {
		method?: "GET" | "POST"
		body?: Record<string, unknown>
		query?: Record<string, string>
	} = {},
): Promise<T> {
	const { data, error } = await auth().$fetch<T>(path, { ...options, throw: false })
	if (error) throw new AuthRequestError(error)
	return data as T
}

/** The session and the server's clock (from the HTTP `Date` header), read from the same answer. */
export type SessionRead = {
	readonly session: SessionResponse | null
	readonly serverNowMs: number | null
}

/** The `Date` header of one response, or null when the server sent none a browser can read. */
function serverNowOf(response: Response): number | null {
	const header = response.headers.get("date")
	if (header === null || header.trim() === "") return null
	const parsed = Date.parse(header)
	return Number.isFinite(parsed) ? parsed : null
}

/** Reads the session and the server's clock in one request, so a drifted local clock cannot judge. */
export async function readSession(): Promise<SessionRead> {
	let serverNowMs: number | null = null
	const { data, error } = await auth().$fetch<SessionResponse | null>("/get-session", {
		throw: false,
		onResponse: ({ response }) => {
			serverNowMs = serverNowOf(response)
		},
	})
	if (error) throw new AuthRequestError(error)
	return { session: (data as SessionResponse | null) ?? null, serverNowMs }
}

export async function getConsent(): Promise<MarketingConsent | null> {
	return (await request<ConsentState>("/marketing-consent")).consent
}

export async function saveConsent(
	optedIn: boolean,
	source: ConsentSource,
	language: ConsentLanguage,
): Promise<MarketingConsent | null> {
	return (
		await request<ConsentState>("/marketing-consent", {
			method: "POST",
			body: { optedIn, source, language },
		})
	).consent
}

export async function addPasskey(name: string): Promise<void> {
	const { error } = await auth().passkey.addPasskey({ name })
	if (error) throw new AuthRequestError(error)
}

export async function startSocial(
	provider: "google" | "github",
	callbackURL: string,
	errorCallbackURL: string,
): Promise<void> {
	const { error } = await auth().signIn.social({ provider, callbackURL, errorCallbackURL })
	if (error) throw new AuthRequestError(error)
}

/** Signs in with a passkey; the provider's answer may carry the address that resumes its flow. */
export async function startPasskey(): Promise<string | null> {
	const { data, error } = await auth().signIn.passkey()
	if (error) throw new AuthRequestError(error)
	const resumed = data as { readonly url?: unknown } | null
	return typeof resumed?.url === "string" ? resumed.url : null
}

export async function signOut(): Promise<void> {
	const { error } = await auth().signOut()
	if (error) throw new AuthRequestError(error)
}

export async function deleteAccount(): Promise<void> {
	const { error } = await auth().deleteUser()
	if (error) throw new AuthRequestError(error)
}
