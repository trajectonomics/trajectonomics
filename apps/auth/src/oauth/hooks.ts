import {
	APIError,
	type AuthMiddleware,
	createAuthMiddleware,
	getSessionFromCtx,
} from "better-auth/api"
import { grantTypeDecision } from "../core/grant-type"
import { resourceParameterRejection } from "../core/resource-request"
import { ensureConsentForApproval } from "./consent"
import { consentExpired, expireConsentsForClient } from "./expiry"
import { deleteConsentRow, deletePendingAuthorizationCodes, deleteTokenFamily } from "./family"
import { rejectRefresh } from "./refresh"
import { type OAuthHookOptions, requestResourceValues } from "./request"
import { findConsent } from "./store"
import { readField } from "./values"

const RESOURCE_PATHS = new Set(["/device/code", "/oauth2/authorize", "/oauth2/token"])

export function oauthBeforeHook(options: OAuthHookOptions): AuthMiddleware {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path === "/oauth2/consent") {
			await prepareInteractiveConsent(ctx, options)
			return
		}
		if (ctx.path === undefined || !RESOURCE_PATHS.has(ctx.path)) return
		await checkResourceRequest(ctx, options)
	})
}

async function checkResourceRequest(
	ctx: {
		path?: string | undefined
		context: unknown
		body?: unknown
		query?: unknown
		headers?: Headers | undefined
		request?: Request | undefined
	},
	options: OAuthHookOptions,
): Promise<void> {
	const values = await requestResourceValues(ctx)
	if (resourceParameterRejection(values) !== null) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_target",
			error_description: "a request may name at most one resource",
		})
	}
	if (ctx.path === "/oauth2/authorize") await expireAuthorizeConsent(ctx, options)
	if (ctx.path === "/oauth2/token") await handleToken(ctx, values, options)
}

export function oauthAfterHook(options: OAuthHookOptions): AuthMiddleware {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path === "/device/approve") await ensureConsentForApproval(ctx, options)
	})
}

async function handleToken(
	ctx: { context: unknown; body?: unknown; headers?: Headers | undefined },
	values: readonly string[],
	options: OAuthHookOptions,
): Promise<void> {
	const decision = grantTypeDecision(readField(ctx.body, "grant_type"))
	if (decision.rejection !== null) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description:
				decision.rejection === "grant-type-padded"
					? "grant_type must not carry surrounding whitespace"
					: "grant_type is required",
		})
	}
	// The normalized value is what both branches compare. A padded value was rejected above,
	// so it can never skip the refresh checks the way the raw `=== "refresh_token"` test did.
	if (decision.grantType === "refresh_token") await rejectRefresh(ctx, values, options)
}

async function expireAuthorizeConsent(
	ctx: { context: unknown; query?: unknown; headers?: Headers | undefined },
	options: OAuthHookOptions,
): Promise<void> {
	const clientId = readField(ctx.query, "client_id")
	if (typeof clientId !== "string" || clientId === "") return
	await expireConsentsForClient(ctx, clientId, options)
}

/**
 * Before the provider creates or updates an interactive consent, remove a leftover token family
 * for the signed-in user. If a consent already exists and is expired, delete it too so the
 * provider creates a fresh row with a new `createdAt` instead of updating the dead one.
 */
async function prepareInteractiveConsent(
	ctx: { context: unknown; body?: unknown; headers?: Headers | undefined },
	options: OAuthHookOptions,
): Promise<void> {
	const oauthQuery = readField(ctx.body, "oauth_query")
	if (typeof oauthQuery !== "string") return
	const clientId = new URLSearchParams(oauthQuery).get("client_id")
	if (clientId === null || clientId === "") return
	const session = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0])
	const userId = session?.user?.id
	if (typeof userId !== "string") return
	const existing = await findConsent(ctx, clientId, userId)
	if (existing !== null) {
		if (!consentExpired(ctx, existing, options)) return
		await deleteConsentRow(ctx, existing.id)
	}
	await deleteTokenFamily(ctx, { userId, clientId })
	await deletePendingAuthorizationCodes(ctx, { userId, clientId })
}
