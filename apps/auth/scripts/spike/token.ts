import { SPIKE_NOW_HEADER } from "./config"
import type { Session } from "./http"
import { formWithResources, requestResult } from "./request"
import type { RequestResult, TokenResponse } from "./types"

export async function refresh(
	session: Session,
	clientId: string,
	refreshToken: string,
): Promise<TokenResponse> {
	const result = await refreshRequest(session, clientId, refreshToken)
	if (result.status !== 200) {
		throw new Error(`refresh -> ${result.status}: ${JSON.stringify(result.body)}`)
	}
	return result.body as TokenResponse
}

export async function refreshRequest(
	session: Session,
	clientId: string,
	refreshToken: string,
	input: { resources?: readonly string[]; now?: string; grantType?: string } = {},
): Promise<RequestResult> {
	const headers = input.now === undefined ? undefined : { [SPIKE_NOW_HEADER]: input.now }
	return requestResult(
		session,
		"/api/auth/oauth2/token",
		formWithResources(
			{
				grant_type: input.grantType ?? "refresh_token",
				refresh_token: refreshToken,
				client_id: clientId,
			},
			input.resources,
			headers,
		),
	)
}

export async function tokenRequest(
	session: Session,
	fields: Record<string, string>,
	resources?: readonly string[],
): Promise<RequestResult> {
	return requestResult(session, "/api/auth/oauth2/token", formWithResources(fields, resources))
}
