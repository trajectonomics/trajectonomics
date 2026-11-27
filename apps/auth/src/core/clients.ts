/**
 * The first-party OAuth clients, registered server-side. Production keeps `clientPrivileges`
 * closed, so no signed-in user can create a client over HTTP; this manifest is the only source.
 * `scripts/generate-clients.ts` turns it into a numbered migration, and the deploy workflow
 * applies migrations before the Worker starts (ADR 0002).
 *
 * Every client is linked to exactly one resource (gate 1 and gate 5). Client ids are public and
 * stable; there are no secrets here because both clients are public.
 */
import { DATA_AUDIENCE, type OAuthScope } from "./resources"

export const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"

export type OAuthClientDefinition = {
	/** Public, stable client id. */
	clientId: string
	name: string
	applicationType: "native" | "web"
	grantTypes: readonly string[]
	responseTypes: readonly string[]
	scopes: readonly OAuthScope[]
	redirectUris: readonly string[]
	requirePkce: boolean
	/** The one RFC 8707 resource this client may request. */
	resource: string
	skipConsent: boolean
}

export const OAUTH_CLIENTS: readonly OAuthClientDefinition[] = [
	{
		// The data collector CLI: RFC 8628 device authorization, then refresh.
		clientId: "traj-data-collector",
		name: "traj data collector",
		applicationType: "native",
		grantTypes: [DEVICE_CODE_GRANT_TYPE, "refresh_token"],
		responseTypes: [],
		scopes: ["openid", "offline_access", "data:ingest"],
		redirectUris: [],
		requirePkce: false,
		resource: DATA_AUDIENCE,
		skipConsent: false,
	},
	{
		// The data site's web sign-in: authorization code with PKCE.
		clientId: "traj-data-web",
		name: "Trajectonomics data site",
		applicationType: "web",
		grantTypes: ["authorization_code"],
		responseTypes: ["code"],
		scopes: ["openid", "profile", "email"],
		redirectUris: ["https://trajectonomics.com/data/auth/callback"],
		requirePkce: true,
		resource: DATA_AUDIENCE,
		skipConsent: false,
	},
]
