import { APIError, type AuthMiddleware, createAuthMiddleware } from "better-auth/api"
import {
	authorizeMethodRejection,
	deviceScopeRejection,
	formMediaTypeRejection,
} from "../core/oauth-request"
import { settleDeviceApproval } from "./approval-settlement"
import { recordDeviceApprovalConsent } from "./consent"
import { expireConsentForSession } from "./expiry"
import { prepareInteractiveConsent } from "./interactive"
import { authorizationClientId, isEndpointRequest, type OAuthHookOptions } from "./request"
import { checkResourceCount } from "./resource-gate"
import { holdDeviceSettlement } from "./spike-hold"
import { checkTokenRequest } from "./token-hook"
import { readField } from "./values"

type HookContext = {
	path?: string | undefined
	method?: string | undefined
	context: unknown
	body?: unknown
	query?: unknown
	headers?: Headers | undefined
	request?: Request | undefined
}

export function oauthBeforeHook(options: OAuthHookOptions): AuthMiddleware {
	return createAuthMiddleware(async (ctx) => {
		switch (ctx.path) {
			case "/device/code":
				await checkDeviceCodeRequest(ctx)
				return
			case "/oauth2/authorize":
				await checkAuthorizeRequest(ctx, options)
				return
			case "/oauth2/consent":
				await prepareInteractiveConsent(ctx, options, true)
				return
			case "/oauth2/continue":
				await prepareInteractiveConsent(ctx, options, false)
				return
			case "/oauth2/token":
				await checkTokenRequest(ctx, options)
				return
			case "/device/approve":
				// Record the approval before the endpoint marks the code `approved`, so no poll can
				// redeem a code whose consent row does not exist yet.
				await recordDeviceApprovalConsent(ctx, options)
				return
			default:
				return
		}
	})
}

/** `/device/approve` only: take back an approval whose endpoint did not finish it. */
export function oauthAfterHook(options: OAuthHookOptions): AuthMiddleware {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path !== "/device/approve") return
		// Dev-only: let the spike redeem the code before this request settles.
		await holdDeviceSettlement(ctx, options)
		await settleDeviceApproval(ctx, options.database)
	})
}

/**
 * `/device/code`: reject the two shapes the library would otherwise parse differently from this
 * hook (a lying media type and a repeated `resource`) and a request that names no scope.
 */
async function checkDeviceCodeRequest(ctx: HookContext): Promise<void> {
	if (formMediaTypeRejection(ctx.request?.headers.get("content-type")) !== null) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: "Content-Type must be exactly application/x-www-form-urlencoded",
		})
	}
	if (deviceScopeRejection(readField(ctx.body, "scope")) !== null) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: "the device request must name a scope",
		})
	}
	await checkResourceCount(ctx)
}

/**
 * `/oauth2/authorize`: reject a client POST (its body is parsed before this hook, so a repeated
 * `resource` would collapse), then apply the one-resource gate and expire the signed-in user's
 * own consent for this client. The same hook runs when the provider re-dispatches authorize after
 * a sign-in; there the real request is the sign-in, so the POST rule does not fire.
 */
async function checkAuthorizeRequest(ctx: HookContext, options: OAuthHookOptions): Promise<void> {
	const endpointRequest = isEndpointRequest({ path: ctx.path, request: ctx.request })
	const rejection = authorizeMethodRejection({
		method: ctx.method ?? ctx.request?.method,
		isEndpointRequest: endpointRequest,
	})
	if (rejection !== null) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: "POST is not supported on the authorization endpoint",
		})
	}
	await checkResourceCount(ctx)
	const clientId = authorizationClientId(ctx)
	if (clientId === undefined) return
	await expireConsentForSession(ctx, clientId, options)
}
