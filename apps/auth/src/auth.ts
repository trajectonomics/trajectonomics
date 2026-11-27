import { oauthDeviceAuthorization, oauthProvider } from "@better-auth/oauth-provider"
import { passkey } from "@better-auth/passkey"
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { jwt } from "better-auth/plugins"
import { devSignInAllowed } from "./core/dev"
import type { Env } from "./env"

/** The audience of the data server; the spike's example of one registered server. */
export const DATA_AUDIENCE = "https://data.trajectonomics.com"
/** A second registered server, so the spike can prove one server's token fails at the other. */
export const RELAY_AUDIENCE = "https://relay.trajectonomics.com"

export const OAUTH_SCOPES = ["openid", "profile", "email", "offline_access", "data:ingest"] as const

/** The access JWT lifetime: fifteen minutes, as the design requires. */
export const ACCESS_TOKEN_TTL_SECONDS = 900
/** The refresh lifetime: thirty days. */
export const REFRESH_TOKEN_TTL_SECONDS = 2_592_000

export type CreateAuthInput = {
	env: Env
	database?: BetterAuthOptions["database"]
	/** Defaults to `env.BETTER_AUTH_URL`; the spike passes a local origin. */
	baseURL?: string
}

/**
 * Builds one Better Auth instance for a request. On Workers a binding cannot be read at module
 * scope, so the Worker calls this per request; the D1 adapter is created from `env.DB` each time.
 *
 * The dev-only email + password provider exists for the spike's test user and cannot be enabled
 * in production (`devSignInAllowed`). Every other sign-in goes through Google, GitHub or a passkey.
 */
export function createAuth(input: CreateAuthInput) {
	return betterAuth(authOptions(input))
}

/** The same options without constructing the instance, so the schema generator can read them. */
export function authOptions(input: CreateAuthInput): BetterAuthOptions {
	const baseURL = input.baseURL ?? input.env.BETTER_AUTH_URL
	const secret = requireSecret(input.env.BETTER_AUTH_SECRET)
	const devSignIn = devSignInAllowed({
		environment: input.env.ENVIRONMENT,
		devOnly: input.env.DEV_ONLY,
		baseUrl: baseURL,
	})
	const socialProviders = buildSocialProviders(input.env)
	const passkeyRpID = input.env.PASSKEY_RP_ID ?? new URL(baseURL).hostname
	const passkeyOrigin = input.env.PASSKEY_ORIGIN ?? new URL(baseURL).origin

	return {
		appName: "Trajectonomics",
		baseURL,
		basePath: "/api/auth",
		secret,
		database: input.database ?? (input.env.DB as unknown as BetterAuthOptions["database"]),
		// Only auth's own origin. The apex hosts the docs, the blog and the data site, and trusting it
		// would let an XSS there make credentialed requests here (ADR 0001).
		trustedOrigins: devSignIn ? [baseURL, "http://localhost:8787"] : [baseURL],
		// `/token` mints a JWT with the name and email for auth's own origin; nothing needs it.
		disabledPaths: ["/token"],
		emailAndPassword: {
			enabled: devSignIn,
			minPasswordLength: 12,
		},
		socialProviders,
		plugins: [
			jwt({
				jwks: {
					keyPairConfig: { alg: "EdDSA", crv: "Ed25519" },
					rotationInterval: 2_592_000,
				},
				jwt: { issuer: baseURL, expirationTime: `${ACCESS_TOKEN_TTL_SECONDS}s` },
				disableSettingJwtHeader: true,
			}),
			passkey({ rpID: passkeyRpID, rpName: "Trajectonomics", origin: passkeyOrigin }),
			oauthProvider({
				loginPage: "/sign-in",
				consentPage: "/consent",
				scopes: [...OAUTH_SCOPES],
				resources: [
					{ identifier: DATA_AUDIENCE, accessTokenTtl: ACCESS_TOKEN_TTL_SECONDS },
					{ identifier: RELAY_AUDIENCE, accessTokenTtl: ACCESS_TOKEN_TTL_SECONDS },
				],
				resourceSeedScope: "process",
				// Production: no signed-in user may create OAuth clients, and a client may request only
				// the resources it is linked to. The service slice registers and links the data and CLI
				// clients server-side. The local spike needs session registration, so both relax only
				// when the dev sign-in gate is open.
				clientPrivileges: () => devSignIn,
				enforcePerClientResources: !devSignIn,
				accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
				refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
				allowDynamicClientRegistration: false,
			}),
			oauthDeviceAuthorization(),
		],
	}
}

export type Auth = ReturnType<typeof createAuth>

/** The shortest `BETTER_AUTH_SECRET` the Worker accepts. */
export const MIN_SECRET_LENGTH = 32

/**
 * Better Auth falls back to a public default secret unless `NODE_ENV` is `production`, which a
 * Worker never sets. Refuse to start instead, so cookies, OAuth state and the encrypted signing
 * key are never protected by a published string.
 */
export function requireSecret(secret: string | undefined): string {
	if (secret === undefined || secret.length < MIN_SECRET_LENGTH) {
		throw new Error(`BETTER_AUTH_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`)
	}
	return secret
}

/**
 * Google and GitHub are configured only when both halves of a pair exist. An empty placeholder
 * therefore leaves the provider off instead of making the Worker fail at boot.
 */
function buildSocialProviders(env: Env): BetterAuthOptions["socialProviders"] {
	const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {}
	if (present(env.GOOGLE_CLIENT_ID) && present(env.GOOGLE_CLIENT_SECRET)) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		}
	}
	if (present(env.GITHUB_CLIENT_ID) && present(env.GITHUB_CLIENT_SECRET)) {
		providers.github = {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		}
	}
	return providers
}

function present(value: string | undefined): value is string {
	return value !== undefined && value.trim() !== ""
}
