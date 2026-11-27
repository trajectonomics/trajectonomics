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
	ConsentSource,
	ConsentState,
	MarketingConsent,
	SessionResponse,
} from "../lib/api-types"
import { isSignedOAuthSearch } from "../lib/oauth-search"
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
): Promise<MarketingConsent | null> {
	return (
		await request<ConsentState>("/marketing-consent", { method: "POST", body: { optedIn, source } })
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

/** The passkey POST carries no OAuth query, so the page can resume the flow itself afterwards. */
export async function startPasskey(): Promise<void> {
	const search = window.location.search
	const stripped = isSignedOAuthSearch(search)
	if (stripped) window.history.replaceState(null, "", window.location.pathname)
	try {
		const { error } = await auth().signIn.passkey()
		if (error) throw new AuthRequestError(error)
	} finally {
		if (stripped) window.history.replaceState(null, "", `${window.location.pathname}${search}`)
	}
}

export async function signOut(): Promise<void> {
	const { error } = await auth().signOut()
	if (error) throw new AuthRequestError(error)
}

export async function deleteAccount(): Promise<void> {
	const { error } = await auth().deleteUser()
	if (error) throw new AuthRequestError(error)
}
