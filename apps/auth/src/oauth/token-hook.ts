/** `/oauth2/token`: the one-resource gate plus the normalized `grant_type` and refresh checks. */
import { APIError } from "better-auth/api"
import { grantTypeDecision } from "../core/grant-type"
import { rejectRefresh } from "./refresh"
import type { OAuthHookOptions } from "./request"
import { checkResourceCount } from "./resource-gate"
import { readField } from "./values"

type TokenHookContext = {
	context: unknown
	body?: unknown
	query?: unknown
	headers?: Headers | undefined
	request?: Request | undefined
}

export async function checkTokenRequest(
	ctx: TokenHookContext,
	options: OAuthHookOptions,
): Promise<void> {
	const values = await checkResourceCount(ctx)
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
