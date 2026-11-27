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
		secret: input.env.BETTER_AUTH_SECRET,
		database: input.database ?? (input.env.DB as unknown as BetterAuthOptions["database"]),
		trustedOrigins: devSignIn
			? [baseURL, "https://trajectonomics.com", "http://localhost:8787"]
			: [baseURL, "https://trajectonomics.com"],
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
				// The session client-registration endpoint cannot link a client to a resource; the
				// admin endpoint that can is server-only. Production registration links clients when
				// the owner registers the data and CLI clients.
				enforcePerClientResources: false,
				accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
				refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
				allowDynamicClientRegistration: false,
			}),
			oauthDeviceAuthorization(),
		],
	}
}

export type Auth = ReturnType<typeof createAuth>

/**
 * Google and GitHub are configured only when both halves of a pair exist. An empty placeholder
 * therefore leaves the provider off instead of making the Worker fail at boot.
 */
function buildSocialProviders(env: Env): BetterAuthOptions["socialProviders"] {
	const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {}
	if (env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		}
	}
	if (env.GITHUB_CLIENT_ID !== undefined && env.GITHUB_CLIENT_SECRET !== undefined) {
		providers.github = {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		}
	}
	return providers
}
