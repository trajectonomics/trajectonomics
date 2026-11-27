/**
 * The only module that creates and calls the Better Auth client. Every island calls these
 * functions, so the client's plugins and the signed OAuth query are handled in one place.
 */
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

export async function getSession(): Promise<SessionResponse | null> {
	return request<SessionResponse | null>("/get-session")
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
): Promise<void> {
	const { error } = await auth().signIn.social({ provider, callbackURL })
	if (error) throw new AuthRequestError(error)
}

/**
 * Signs in with a passkey. The provider's client plugin puts the page's signed query on the POST,
 * so the provider's after-hook resumes an interrupted `prompt=login` or `max_age=0` flow on its own
 * and answers with the address to continue to. The page navigates there when it gets one, and
 * otherwise continues to its own `next`.
 */
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
