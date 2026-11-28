/** The tokens one successful device or refresh grant returns. */
export type TokenSet = {
	accessToken: string
	refreshToken: string
	expiresIn: number
	scope: string | null
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

function nonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0
}

/** Validates a token response; the error never carries a token value. */
export function parseTokenResponse(body: unknown): TokenSet {
	const object = asObject(body)
	if (object === null) throw new Error("token response is not a JSON object")
	const accessToken = object["access_token"]
	if (!nonEmptyString(accessToken)) throw new Error("token response has no access_token")
	const refreshToken = object["refresh_token"]
	if (!nonEmptyString(refreshToken)) throw new Error("token response has no refresh_token")
	const expiresIn = object["expires_in"]
	if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
		throw new Error("token response has no numeric expires_in")
	}
	const scope = object["scope"]
	return { accessToken, refreshToken, expiresIn, scope: nonEmptyString(scope) ? scope : null }
}

/**
 * The `sub` claim of a JWT, decoded without verifying it. For display and storage only: the data
 * Worker is what verifies the token on ingest.
 */
export function accountIdOf(jwt: string): string | null {
	const payload = jwt.split(".")[1]
	if (payload === undefined || payload.length === 0) return null
	try {
		const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
		const sub = asObject(decoded)?.["sub"]
		return nonEmptyString(sub) ? sub : null
	} catch {
		return null
	}
}
