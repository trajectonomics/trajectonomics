import {
	createLocalJWKSet,
	type JSONWebKeySet,
	type JWTPayload,
	type JWTVerifyResult,
	jwtVerify,
} from "jose"

export type VerifyResult =
	| { ok: true; payload: JWTPayload; algorithm: string }
	| { ok: false; error: string }

/** Verifies a compact JWS against a JWKS, requiring EdDSA, the issuer and one audience. */
export async function verifyJwt(input: {
	token: string
	jwks: JSONWebKeySet
	issuer: string
	audience: string
	algorithms?: string[]
}): Promise<VerifyResult> {
	try {
		const result: JWTVerifyResult = await jwtVerify(input.token, createLocalJWKSet(input.jwks), {
			issuer: input.issuer,
			audience: input.audience,
			algorithms: input.algorithms ?? ["EdDSA"],
		})
		return {
			ok: true,
			payload: result.payload,
			algorithm: result.protectedHeader.alg ?? "none",
		}
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) }
	}
}

/** True when a verification failed for the reason we expected, not a different one. */
export function failedBecause(result: VerifyResult, fragment: string): boolean {
	return !result.ok && result.error.toLowerCase().includes(fragment.toLowerCase())
}
