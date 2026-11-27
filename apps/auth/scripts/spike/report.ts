import type { JSONWebKeySet, JWTPayload } from "jose"
import { DATA_AUDIENCE, RELAY_AUDIENCE } from "../../src/core/resources"
import { describeClaims, describeJwk, describeTokenResponse } from "../../src/core/token-shape"
import { buildChecks } from "./checks"
import { BASE_URL } from "./config"
import { securityChecks } from "./security-checks"
import type { DeviceCodeResponse, GateEvidence, SecurityEvidence, TokenResponse } from "./types"
import { verifyJwt } from "./verify"

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
	gates: GateEvidence & SecurityEvidence
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
	const checks = {
		...buildChecks({
			pending: input.pending,
			token,
			refreshed: input.refreshed,
			jwks,
			claims: input.claims,
			verificationOk: verification.ok,
			wrongAudienceError: wrongAudience.ok ? null : wrongAudience.error,
			wrongAlgorithmOk: wrongAlgorithm.ok,
			gates: input.gates,
		}),
		...securityChecks(input.gates),
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
			gates: input.gates,
			checks,
		},
	}
}
