import { APIError, type AuthMiddleware, createAuthMiddleware } from "better-auth/api"
import { resourceParameterRejection } from "../core/resource-request"
import { ensureConsentForApproval, ensureDeviceConsent } from "./consent"
import { rejectRefresh } from "./refresh"
import { type OAuthHookOptions, requestResourceValues } from "./request"

const RESOURCE_PATHS = new Set(["/device/code", "/oauth2/authorize", "/oauth2/token"])
const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"

export function oauthBeforeHook(options: OAuthHookOptions): AuthMiddleware {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path === undefined || !RESOURCE_PATHS.has(ctx.path)) return
		const values = await requestResourceValues(ctx)
		if (resourceParameterRejection(values) !== null) {
			throw new APIError("BAD_REQUEST", {
				error: "invalid_target",
				error_description: "a request may name at most one resource",
			})
		}
		if (ctx.path === "/oauth2/token") await handleToken(ctx, values, options)
	})
}

export function oauthAfterHook(): AuthMiddleware {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path === "/device/approve") await ensureConsentForApproval(ctx)
	})
}

async function handleToken(
	ctx: { context: unknown; body?: unknown; headers?: Headers | undefined },
	values: readonly string[],
	options: OAuthHookOptions,
): Promise<void> {
	const grantType = (ctx.body as Record<string, unknown> | undefined)?.["grant_type"]
	if (grantType === "refresh_token") await rejectRefresh(ctx, values, options)
	else if (grantType === DEVICE_CODE_GRANT_TYPE) await ensureDeviceConsent(ctx)
}
