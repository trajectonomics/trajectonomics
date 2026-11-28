import { exportJWK, generateKeyPair, type JSONWebKeySet, SignJWT } from "jose"
import { DATA_AUDIENCE, INGEST_SCOPE } from "../../src/core/token"
import { NOW_MS, TEST_ISSUER } from "./fixtures"

/** The fixed clock, in whole seconds, at which the verifier and the signer meet. */
export const TOKEN_NOW_SECONDS = Math.floor(NOW_MS / 1000)

/** What a test may change on a signed token; every default produces an accepted token. */
export type SignOptions = {
	sub?: string | null
	issuer?: string
	audience?: string | string[]
	scope?: string | null
	/** `null` leaves the claim out entirely, which the verifier must refuse. */
	iat?: number | null
	/** `null` leaves the claim out entirely, which the verifier must refuse. */
	exp?: number | null
	nbf?: number
	kid?: string
}

export type TestSigner = {
	privateKey: CryptoKey
	jwks: JSONWebKeySet
	kid: string
	sign(options?: SignOptions): Promise<string>
}

function claimsFor(overrides: SignOptions): {
	payload: Record<string, unknown>
	iat: number | null
	exp: number | null
} {
	const iat = overrides.iat === null ? null : (overrides.iat ?? TOKEN_NOW_SECONDS - 60)
	const exp =
		overrides.exp === null ? null : (overrides.exp ?? (iat ?? TOKEN_NOW_SECONDS - 60) + 900)
	const scope = overrides.scope === undefined ? INGEST_SCOPE : overrides.scope
	return { payload: scope === null ? {} : { scope }, iat, exp }
}

/** Sets `iat` and `exp` only when the claim is present; `null` leaves one out on purpose. */
function withTimes(jwt: SignJWT, iat: number | null, exp: number | null): SignJWT {
	if (iat !== null) jwt.setIssuedAt(iat)
	if (exp !== null) jwt.setExpirationTime(exp)
	return jwt
}

/** A fresh Ed25519 key pair and a signer over it; the key exists only for the test. */
export async function testSigner(options: { kid?: string } = {}): Promise<TestSigner> {
	const kid = options.kid ?? "test-key"
	const { privateKey, publicKey } = await generateKeyPair("EdDSA", {
		crv: "Ed25519",
		extractable: true,
	})
	const jwk = await exportJWK(publicKey)
	const jwks: JSONWebKeySet = { keys: [{ ...jwk, kid, alg: "EdDSA", use: "sig" }] }
	async function sign(overrides: SignOptions = {}): Promise<string> {
		const { payload, iat, exp } = claimsFor(overrides)
		const jwt = withTimes(
			new SignJWT(payload)
				.setProtectedHeader({ alg: "EdDSA", kid: overrides.kid ?? kid })
				.setIssuer(overrides.issuer ?? TEST_ISSUER)
				.setAudience(overrides.audience ?? DATA_AUDIENCE),
			iat,
			exp,
		)
		if (overrides.sub !== null) jwt.setSubject(overrides.sub ?? "auth-user-a")
		if (overrides.nbf !== undefined) jwt.setNotBefore(overrides.nbf)
		return jwt.sign(privateKey)
	}
	return { privateKey, jwks, kid, sign }
}
