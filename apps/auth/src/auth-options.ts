import type { BetterAuthOptions } from "better-auth"
import { buildPlugins } from "./auth-plugins"
import { buildSocialProviders } from "./auth-providers"
import { devSignInAllowed } from "./core/dev"
import { REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS } from "./core/resources"
import { requireSecret } from "./core/secret"
import type { Env } from "./env"
import {
	type OAuthHookOptions,
	oauthAfterHook,
	oauthBeforeHook,
	testClockEnabled,
} from "./oauth-hooks"

export type CreateAuthInput = {
	env: Env
	database?: BetterAuthOptions["database"]
	/** Defaults to `env.BETTER_AUTH_URL`; the spike passes a local origin. */
	baseURL?: string
}

/** The options without constructing the instance, so the schema generator can read them. */
export function authOptions(input: CreateAuthInput): BetterAuthOptions {
	const baseURL = input.baseURL ?? input.env.BETTER_AUTH_URL
	const devSignIn = devSignInAllowed({
		environment: input.env.ENVIRONMENT,
		devOnly: input.env.DEV_ONLY,
		baseUrl: baseURL,
	})
	const hookOptions: OAuthHookOptions = {
		absoluteLifetimeSeconds: REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS,
		testClock: testClockEnabled(devSignIn),
	}
	return {
		appName: "Trajectonomics",
		baseURL,
		basePath: "/api/auth",
		secret: requireSecret(input.env.BETTER_AUTH_SECRET),
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
		socialProviders: buildSocialProviders({
			googleClientId: input.env.GOOGLE_CLIENT_ID,
			googleClientSecret: input.env.GOOGLE_CLIENT_SECRET,
			githubClientId: input.env.GITHUB_CLIENT_ID,
			githubClientSecret: input.env.GITHUB_CLIENT_SECRET,
		}),
		// A Worker never sets NODE_ENV, so the library's production default never turns this on.
		// Enable it explicitly and keep the counter in D1, shared by every isolate (gate 2).
		rateLimit: {
			enabled: true,
			storage: "database",
			window: 60,
			max: 100,
			customRules: {
				"/oauth2/token": { window: 60, max: 60 },
				"/device/code": { window: 60, max: 10 },
				"/device": { window: 60, max: 5 },
				"/device/approve": { window: 60, max: 10 },
				"/sign-in": { window: 60, max: 5 },
				"/sign-in/*": { window: 60, max: 5 },
				"/sign-up/*": { window: 60, max: 5 },
				"/passkey/*": { window: 60, max: 10 },
			},
		},
		advanced: {
			// Cloudflare sets this header at the edge and overwrites a client value.
			ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
		},
		hooks: {
			before: oauthBeforeHook(hookOptions),
			after: oauthAfterHook(),
		},
		plugins: buildPlugins({
			baseURL,
			passkeyRpID: input.env.PASSKEY_RP_ID ?? new URL(baseURL).hostname,
			passkeyOrigin: input.env.PASSKEY_ORIGIN ?? new URL(baseURL).origin,
		}),
	}
}
