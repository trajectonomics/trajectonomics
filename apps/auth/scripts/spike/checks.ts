import type { JSONWebKeySet, JWTPayload } from "jose"
import { DATA_AUDIENCE, RELAY_AUDIENCE } from "../../src/core/resources"
import { BASE_URL, COLLECTOR_CLIENT_ID } from "./config"
import type { GateEvidence, TokenResponse } from "./types"

export function buildChecks(input: {
	pending: string
	token: TokenResponse
	refreshed: TokenResponse
	jwks: JSONWebKeySet
	claims: JWTPayload
	verificationOk: boolean
	wrongAudienceError: string | null
	wrongAlgorithmOk: boolean
	gates: GateEvidence
}): Record<string, boolean> {
	const { token, gates } = input
	const audience = input.claims["aud"]
	const dataAudience =
		audience === DATA_AUDIENCE || (Array.isArray(audience) && audience.includes(DATA_AUDIENCE))
	const relayAudience = Array.isArray(audience) && audience.includes(RELAY_AUDIENCE)
	return {
		pendingPollReportsAuthorizationPending: input.pending === "authorization_pending",
		deviceCodeHasRefreshToken: token.refresh_token !== undefined,
		refreshGrantRotatesRefreshToken:
			input.refreshed.refresh_token !== undefined &&
			input.refreshed.refresh_token !== token.refresh_token,
		accessTokenExpiresInFifteenMinutes: token.expires_in === 900,
		accessTokenIsEdDsaJwt:
			token.access_token.split(".").length === 3 && input.claims["iss"] === BASE_URL,
		accessTokenAudienceIsDataServer: dataAudience && !relayAudience,
		seededCollectorCompletesDeviceFlow: seededCollector(input.claims, token),
		jwksPublishesEd25519: input.jwks.keys.some(
			(key) => key.kty === "OKP" && key.crv === "Ed25519" && key.alg === "EdDSA",
		),
		jwtVerifiesAgainstJwks: input.verificationOk,
		wrongAudienceRejected: input.wrongAudienceError?.toLowerCase().includes("aud") ?? false,
		wrongAlgorithmRejected: !input.wrongAlgorithmOk,
		multiResourceDeviceRequestRejected: isStatusError(
			gates.multiResourceDeviceRequest,
			400,
			"invalid_target",
		),
		multiResourceTokenRequestRejected: isStatusError(
			gates.multiResourceTokenRequest,
			400,
			"invalid_target",
		),
		dataIngestNotIssuedForRelay: isOneOf(gates.dataIngestForRelay, 400, [
			"invalid_scope",
			"invalid_target",
		]),
		refreshWideningFromDataRejected: isStatusError(
			gates.refreshWideningFromData,
			400,
			"invalid_target",
		),
		refreshWideningFromNoneRejected: isStatusError(
			gates.refreshWideningFromNone,
			400,
			"invalid_target",
		),
		revokedGrantRefreshFails: isStatusError(gates.refreshAfterRevoke, 400, "invalid_grant"),
		grantListedAndRevoked: gates.grantListed && gates.grantRevoked,
		refreshPastAbsoluteLifetimeFails: isStatusError(
			gates.refreshPastAbsoluteLifetime,
			400,
			"invalid_grant",
		),
		userCodeGuessesRateLimited: gates.rateLimitedUserCodeGuesses,
	}
}

function seededCollector(claims: JWTPayload, token: TokenResponse): boolean {
	return (
		claims["client_id"] === COLLECTOR_CLIENT_ID &&
		token.scope.split(" ").includes("data:ingest") &&
		typeof token.refresh_token === "string"
	)
}

function isStatusError(
	result: { status: number; error: string | null },
	status: number,
	error: string,
): boolean {
	return result.status === status && result.error === error
}

function isOneOf(
	result: { status: number; error: string | null },
	status: number,
	errors: readonly string[],
): boolean {
	return result.status === status && result.error !== null && errors.includes(result.error)
}
