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
