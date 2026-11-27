import { oauthDeviceAuthorization, oauthProvider } from "@better-auth/oauth-provider"
import { passkey } from "@better-auth/passkey"
import type { BetterAuthOptions } from "better-auth"
import { jwt } from "better-auth/plugins"
import {
	ACCESS_TOKEN_TTL_SECONDS,
	OAUTH_RESOURCES,
	OAUTH_SCOPES,
	REFRESH_TOKEN_REUSE_INTERVAL_SECONDS,
	REFRESH_TOKEN_TTL_SECONDS,
} from "./core/resources"
import { grantManagement } from "./oauth-grants"

/** The plugin list, split out so `auth-options.ts` stays readable. */
export function buildPlugins(input: {
	baseURL: string
	passkeyRpID: string
	passkeyOrigin: string
}): NonNullable<BetterAuthOptions["plugins"]> {
	return [
		jwt({
			jwks: {
				keyPairConfig: { alg: "EdDSA", crv: "Ed25519" },
				rotationInterval: 2_592_000,
			},
			jwt: { issuer: input.baseURL, expirationTime: `${ACCESS_TOKEN_TTL_SECONDS}s` },
			disableSettingJwtHeader: true,
		}),
		passkey({
			rpID: input.passkeyRpID,
			rpName: "Trajectonomics",
			origin: input.passkeyOrigin,
		}),
		oauthProvider({
			loginPage: "/sign-in",
			consentPage: "/consent",
			scopes: [...OAUTH_SCOPES],
			resources: OAUTH_RESOURCES.map((resource) => ({
				identifier: resource.identifier,
				accessTokenTtl: resource.accessTokenTtl,
				allowedScopes: [...resource.allowedScopes],
			})),
			resourceSeedScope: "process",
			// Production: no signed-in user may create an OAuth client, and a client may request only
			// the resources it is linked to. First-party clients are seeded from `src/core/clients.ts`
			// by a committed migration; the spike uses the same seeded collector (gate 5).
			clientPrivileges: () => false,
			enforcePerClientResources: true,
			accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
			refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
			// A lost refresh response can be retried for a minute; outside it, replay revokes the
			// family. The grant's absolute lifetime is enforced in the before hook (gate 3).
			refreshTokenReuseInterval: REFRESH_TOKEN_REUSE_INTERVAL_SECONDS,
			allowDynamicClientRegistration: false,
		}),
		oauthDeviceAuthorization(),
		grantManagement(),
	]
}
