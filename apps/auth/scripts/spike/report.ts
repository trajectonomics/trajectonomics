import type { JSONWebKeySet, JWTPayload } from "jose"
import { DATA_AUDIENCE, RELAY_AUDIENCE } from "../../src/auth"
import { describeClaims, describeJwk, describeTokenResponse } from "../../src/core/token-shape"
import { BASE_URL } from "./config"
import type { DeviceCodeResponse, TokenResponse } from "./flow"
import { failedBecause, verifyJwt } from "./verify"

export type SpikeReport = {
	report: Record<string, unknown>
	ok: boolean
}

/** Verifies the token three ways and builds the redacted report the harness prints. */
export async function buildReport(input: {
	device: DeviceCodeResponse
	pending: string
	token: TokenResponse
	refreshed: TokenResponse
	jwks: JSONWebKeySet
	claims: JWTPayload
}): Promise<SpikeReport> {
	const { token, jwks } = input
	const verification = await verifyJwt({
		token: token.access_token,
		jwks,
		issuer: BASE_URL,
		audience: DATA_AUDIENCE,
	})
	const wrongAudience = await verifyJwt({
		token: token.access_token,
		jwks,
		issuer: BASE_URL,
		audience: RELAY_AUDIENCE,
	})
	const wrongAlgorithm = await verifyJwt({
		token: token.access_token,
		jwks,
		issuer: BASE_URL,
		audience: DATA_AUDIENCE,
		algorithms: ["RS256"],
	})
	const audience = input.claims["aud"]
	const dataAudience =
		audience === DATA_AUDIENCE || (Array.isArray(audience) && audience.includes(DATA_AUDIENCE))
	const relayAudience = Array.isArray(audience) && audience.includes(RELAY_AUDIENCE)
	const checks = {
		pendingPollReportsAuthorizationPending: input.pending === "authorization_pending",
		deviceCodeHasRefreshToken: input.token.refresh_token !== undefined,
		refreshGrantRotatesRefreshToken:
			input.refreshed.refresh_token !== undefined &&
			input.refreshed.refresh_token !== input.token.refresh_token,
		accessTokenExpiresInFifteenMinutes: input.token.expires_in === 900,
		accessTokenIsEdDsaJwt:
			input.token.access_token.split(".").length === 3 && input.claims["iss"] === BASE_URL,
		accessTokenAudienceIsDataServer: dataAudience && !relayAudience,
		jwksPublishesEd25519: jwks.keys.some(
			(key) => key.kty === "OKP" && key.crv === "Ed25519" && key.alg === "EdDSA",
		),
		jwtVerifiesAgainstJwks: verification.ok,
		wrongAudienceRejected: failedBecause(wrongAudience, "aud"),
		wrongAlgorithmRejected: !wrongAlgorithm.ok,
	}
	return {
		ok: Object.values(checks).every(Boolean),
		report: {
			betterAuthVersion: "1.7.28",
			deviceCode: {
				fields: Object.keys(input.device).sort(),
				expiresIn: input.device.expires_in,
				interval: input.device.interval,
				firstPollError: input.pending,
			},
			deviceToken: {
				...describeTokenResponse(input.token),
				hasIdToken: input.token.id_token !== undefined,
			},
			refreshedToken: describeTokenResponse(input.refreshed),
			accessTokenClaims: describeClaims(input.claims),
			jwksKeys: jwks.keys.map((key) => describeJwk(key)),
			verification: {
				ok: verification.ok,
				algorithm: verification.ok ? verification.algorithm : null,
				error: verification.ok ? null : verification.error,
				wrongAudienceError: wrongAudience.ok ? null : wrongAudience.error,
			},
			checks,
		},
	}
}
