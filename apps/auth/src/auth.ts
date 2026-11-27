import { betterAuth } from "better-auth"
import { authOptions, type CreateAuthInput } from "./auth-options"

export { authOptions, type CreateAuthInput } from "./auth-options"
export {
	ACCESS_TOKEN_TTL_SECONDS,
	DATA_AUDIENCE,
	OAUTH_SCOPES,
	REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS,
	REFRESH_TOKEN_REUSE_INTERVAL_SECONDS,
	REFRESH_TOKEN_TTL_SECONDS,
	RELAY_AUDIENCE,
} from "./core/resources"
export { MIN_SECRET_LENGTH, requireSecret } from "./core/secret"

/**
 * Builds one Better Auth instance for a request. On Workers a binding cannot be read at module
 * scope, so the Worker calls this per request; the D1 adapter is created from `env.DB` each time.
 */
export function createAuth(input: CreateAuthInput) {
	return betterAuth(authOptions(input))
}

export type Auth = ReturnType<typeof createAuth>
