import { createLocalJWKSet, errors, type JSONWebKeySet, type JWTPayload, jwtVerify } from "jose"

/** The audience auth's access tokens name for this Worker (ADR 0015). */
export const DATA_AUDIENCE = "https://trajectonomics.com/data"

/** The scope a token must carry to send usage. */
export const INGEST_SCOPE = "data:ingest"

/** How far the verifier lets a clock differ from auth's, in seconds. */
const SKEW_SECONDS = 30

/** The longest lifetime an accepted token may claim, in seconds. */
const MAX_LIFETIME_SECONDS = 3_600

/** The longest `sub` an accepted token may carry. */
const MAX_SUB_LENGTH = 255

/** Why a token was refused; `unknown_kid` is worth one JWKS refetch. */
export type TokenFailure = "malformed" | "unknown_kid" | "invalid"

/** A verified token's subject, or the reason it was refused. */
export type TokenVerification = { ok: true; sub: string } | { ok: false; reason: TokenFailure }

/** Everything the pure verifier needs: a key set, the expected issuer and audience, and a clock. */
export type TokenInput = {
	jwks: JSONWebKeySet
	issuer: string
	audience: string
	requiredScope: string | null
	nowSeconds: number
}

function carriesScope(payload: JWTPayload, scope: string): boolean {
	const carried = payload["scope"]
	if (typeof carried !== "string") return false
	return carried.split(" ").includes(scope)
}

/** The claim checks jose does not make: `iat` in the past, a short life, and the scope word. */
function claimsHold(payload: JWTPayload, input: TokenInput): boolean {
	const { iat, exp, sub } = payload
	if (typeof iat !== "number" || typeof exp !== "number") return false
	if (iat > input.nowSeconds + SKEW_SECONDS) return false
	if (exp - iat > MAX_LIFETIME_SECONDS) return false
	if (typeof sub !== "string" || sub.length === 0 || sub.length > MAX_SUB_LENGTH) return false
	if (input.requiredScope !== null && !carriesScope(payload, input.requiredScope)) return false
	return true
}

/**
 * Verifies one auth access token (ADR 0015): EdDSA only, the exact issuer, an audience that
 * includes this Worker's, the required scope word, and a life at most an hour. Pure: a JWKS and
 * the current time arrive as arguments.
 */
export async function verifyAccessToken(
	token: string,
	input: TokenInput,
): Promise<TokenVerification> {
	if (token.split(".").length !== 3) return { ok: false, reason: "malformed" }
	let payload: JWTPayload
	try {
		const result = await jwtVerify(token, createLocalJWKSet(input.jwks), {
			algorithms: ["EdDSA"],
			issuer: input.issuer,
			audience: input.audience,
			requiredClaims: ["exp", "iat", "sub"],
			currentDate: new Date(input.nowSeconds * 1000),
			clockTolerance: SKEW_SECONDS,
		})
		payload = result.payload
	} catch (error) {
		// jose refuses an unknown `kid` before any claim check, so the caller may refetch once.
		if (error instanceof errors.JWKSNoMatchingKey) return { ok: false, reason: "unknown_kid" }
		return { ok: false, reason: "invalid" }
	}
	if (!claimsHold(payload, input)) return { ok: false, reason: "invalid" }
	return { ok: true, sub: payload.sub as string }
}
