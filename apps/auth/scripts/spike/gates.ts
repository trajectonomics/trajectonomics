import { DATA_AUDIENCE, RELAY_AUDIENCE } from "../../src/core/resources"
import { COLLECTOR_CLIENT_ID, SCOPES } from "./config"
import {
	deviceCodeRequest,
	guessUserCode,
	listGrants,
	type RequestResult,
	refreshRequest,
	revokeGrant,
	tokenRequest,
} from "./flow"
import type { Session } from "./http"
import type { GateEvidence, TokenResponse } from "./types"

/** Runs every gate check after the main device grant, so the report has one evidence object. */
export async function runGateChecks(
	session: Session,
	currentRefresh: string,
	noResourceToken: TokenResponse,
): Promise<GateEvidence> {
	const multiResourceDeviceRequest = await deviceCodeRequest(session, COLLECTOR_CLIENT_ID, {
		scope: SCOPES,
		resources: [DATA_AUDIENCE, RELAY_AUDIENCE],
	})
	const multiResourceTokenRequest = await tokenRequest(
		session,
		{
			grant_type: "refresh_token",
			refresh_token: currentRefresh,
			client_id: COLLECTOR_CLIENT_ID,
		},
		[DATA_AUDIENCE, RELAY_AUDIENCE],
	)
	const refreshWideningFromData = await refreshRequest(
		session,
		COLLECTOR_CLIENT_ID,
		currentRefresh,
		{ resources: [RELAY_AUDIENCE] },
	)
	const dataIngestForRelay = await deviceCodeRequest(session, COLLECTOR_CLIENT_ID, {
		scope: "data:ingest",
		resources: [RELAY_AUDIENCE],
	})
	const refreshWideningFromNone = await refreshRequest(
		session,
		COLLECTOR_CLIENT_ID,
		noResourceToken.refresh_token ?? "",
		{ resources: [DATA_AUDIENCE] },
	)
	const pastLifetime = new Date(Date.now() + 91 * 24 * 60 * 60 * 1_000).toISOString()
	const refreshPastAbsoluteLifetime = await refreshRequest(
		session,
		COLLECTOR_CLIENT_ID,
		noResourceToken.refresh_token ?? "",
		{ now: pastLifetime },
	)
	const grants = await listGrants(session)
	const collectorGrant = grants.grants.find((grant) => grant.clientId === COLLECTOR_CLIENT_ID)
	const grantRevoked =
		collectorGrant === undefined ? false : (await revokeGrant(session, collectorGrant.id)).revoked
	const refreshAfterRevoke = await refreshRequest(session, COLLECTOR_CLIENT_ID, currentRefresh)
	const rateLimitedUserCodeGuesses = await hitRateLimit(session)
	return {
		multiResourceDeviceRequest: errorShape(multiResourceDeviceRequest),
		multiResourceTokenRequest: errorShape(multiResourceTokenRequest),
		refreshWideningFromData: errorShape(refreshWideningFromData),
		dataIngestForRelay: errorShape(dataIngestForRelay),
		refreshWideningFromNone: errorShape(refreshWideningFromNone),
		refreshPastAbsoluteLifetime: errorShape(refreshPastAbsoluteLifetime),
		refreshAfterRevoke: errorShape(refreshAfterRevoke),
		rateLimitedUserCodeGuesses,
		grantListed: collectorGrant !== undefined,
		grantRevoked,
	}
}

async function hitRateLimit(session: Session): Promise<boolean> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		if ((await guessUserCode(session, `GUESS${attempt}`)) === 429) return true
	}
	return false
}

function errorShape(result: RequestResult): { status: number; error: string | null } {
	const error = result.body["error"]
	return { status: result.status, error: typeof error === "string" ? error : null }
}
