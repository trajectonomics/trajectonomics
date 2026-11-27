import { oauthDeviceAuthorization, oauthProvider } from "@better-auth/oauth-provider"
import { passkey } from "@better-auth/passkey"
import type { D1Database } from "@cloudflare/workers-types"
import type { BetterAuthOptions } from "better-auth"
import { jwt } from "better-auth/plugins"
import {
	ACCESS_TOKEN_TTL_SECONDS,
	OAUTH_RESOURCES,
	OAUTH_SCOPES,
	REFRESH_TOKEN_REUSE_INTERVAL_SECONDS,
	REFRESH_TOKEN_TTL_SECONDS,
} from "./core/resources"
import { marketingConsent } from "./marketing-consent"
import { grantManagement } from "./oauth-grants"
import { pendingDeletion } from "./pending-deletion"

/** Where a signed-in person answers the marketing question before an OAuth flow continues. */
export const POST_LOGIN_PAGE = "/welcome"

/** The plugin list, split out so `auth-options.ts` stays readable. */
export function buildPlugins(input: {
	baseURL: string
	/** The database the consent record's withdrawal and answer are written to in one batch. */
	db: D1Database | undefined
	passkeyRpID: string
	passkeyOrigin: string
	/** True when this person has never answered the marketing question. */
	requiresMarketingConsent: (userId: string) => Promise<boolean>
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
			// A person with no marketing answer sees one question before the flow continues. Once a
			// record exists, `shouldRedirect` returns false and the provider resumes normally.
			postLogin: {
				page: POST_LOGIN_PAGE,
				// There is no organisation or account chooser to reference.
				consentReferenceId: () => undefined,
				shouldRedirect: async ({ user }) => input.requiresMarketingConsent(user.id),
			},
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
		// The CLI prints this page as the verification address; the trailing slash is the page's
		// built address, so the person never goes through a redirect.
		oauthDeviceAuthorization({ verificationUri: "/device/" }),
		grantManagement(),
		marketingConsent({ db: input.db }),
		pendingDeletion(),
	]
}
