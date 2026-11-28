/**
 * `/oauth2/consent` and `/oauth2/continue`: both carry the authorization request in the signed
 * `oauth_query`. Verify the signature before acting on it, then expire the signed-in user's
 * consent, so neither path can issue a code on a grant past its absolute lifetime. On the consent
 * page the leftover token family of an absent consent is removed too, because the library is about
 * to create a fresh approval.
 */
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider"
import { expireConsentForSession, prepareConsentForApproval } from "./expiry"
import type { OAuthHookOptions } from "./request"
import { readField } from "./values"

type InteractiveContext = {
	context: unknown
	body?: unknown
	headers?: Headers | undefined
}

export async function prepareInteractiveConsent(
	ctx: InteractiveContext,
	options: OAuthHookOptions,
	prepareForApproval: boolean,
): Promise<void> {
	const oauthQuery = readField(ctx.body, "oauth_query")
	if (typeof oauthQuery !== "string" || oauthQuery === "") return
	const secret = (ctx.context as { secret?: unknown }).secret
	if (typeof secret !== "string" || secret === "") return
	if (!(await verifyOAuthQueryParams(oauthQuery, secret))) return
	const clientId = new URLSearchParams(oauthQuery).get("client_id")
	if (clientId === null || clientId === "") return
	if (prepareForApproval) await prepareConsentForApproval(ctx, clientId, options)
	else await expireConsentForSession(ctx, clientId, options)
}
