/**
 * Safe descriptions of a token response and its claims, for the spike report. The report is
 * committed, so it must never contain a token: only field names, presence and claim metadata.
 */

export type TokenShape = {
	fields: string[]
	accessTokenIsJwt: boolean
	accessTokenAlgorithm: string | null
	hasRefreshToken: boolean
	expiresIn: number | null
	tokenType: string | null
	scope: string | null
}

export type ClaimShape = {
	iss: string | null
	aud: string[]
	sub: string | null
	scope: string | null
	expiresInSeconds: number | null
	hasJti: boolean
}

/** Describes a token endpoint body without copying any secret value into the report. */
export function describeTokenResponse(body: Record<string, unknown>): TokenShape {
	const accessToken = typeof body["access_token"] === "string" ? body["access_token"] : ""
	const algorithm = accessTokenHeaderAlgorithm(accessToken)
	return {
		fields: Object.keys(body).sort(),
		accessTokenIsJwt: algorithm !== null,
		accessTokenAlgorithm: algorithm,
		hasRefreshToken: typeof body["refresh_token"] === "string" && body["refresh_token"] !== "",
		expiresIn: typeof body["expires_in"] === "number" ? body["expires_in"] : null,
		tokenType: typeof body["token_type"] === "string" ? body["token_type"] : null,
		scope: typeof body["scope"] === "string" ? body["scope"] : null,
	}
}

/** Describes the claims that matter to a verifier, without a user id, email or name. */
export function describeClaims(payload: Record<string, unknown>): ClaimShape {
	const issuedAt = typeof payload["iat"] === "number" ? payload["iat"] : null
	const expiresAt = typeof payload["exp"] === "number" ? payload["exp"] : null
	return {
		iss: typeof payload["iss"] === "string" ? payload["iss"] : null,
		aud: audienceValues(payload["aud"]),
		sub: typeof payload["sub"] === "string" ? "<redacted>" : null,
		scope: typeof payload["scope"] === "string" ? payload["scope"] : null,
		expiresInSeconds: issuedAt !== null && expiresAt !== null ? expiresAt - issuedAt : null,
		hasJti: typeof payload["jti"] === "string",
	}
}

/** A JWKS key description: public material only. */
export type JwkShape = {
	kty: string | null
	crv: string | null
	alg: string | null
	use: string | null
	hasKeyId: boolean
}

export function describeJwk(key: Record<string, unknown>): JwkShape {
	return {
		kty: typeof key["kty"] === "string" ? key["kty"] : null,
		crv: typeof key["crv"] === "string" ? key["crv"] : null,
		alg: typeof key["alg"] === "string" ? key["alg"] : null,
		use: typeof key["use"] === "string" ? key["use"] : null,
		hasKeyId: typeof key["kid"] === "string" && key["kid"] !== "",
	}
}

/** The `alg` of a compact JWS without verifying it; null when the value is not a JWS. */
export function accessTokenHeaderAlgorithm(token: string): string | null {
	const parts = token.split(".")
	if (parts.length !== 3) return null
	try {
		const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0] ?? "")))
		if (header === null || typeof header !== "object") return null
		return typeof header["alg"] === "string" ? header["alg"] : null
	} catch {
		return null
	}
}

function audienceValues(value: unknown): string[] {
	if (typeof value === "string") return [value]
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === "string")
}

function base64UrlToBytes(value: string): Uint8Array {
	const normal = value.replaceAll("-", "+").replaceAll("_", "/")
	const padded = normal.padEnd(Math.ceil(normal.length / 4) * 4, "=")
	const binary = atob(padded)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
	return bytes
}
