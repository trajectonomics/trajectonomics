/** Gate 1 and gate 3 checks for a `refresh_token` grant. */
import { APIError } from "better-auth/api"
import { grantLifetimeRejection, refreshResourceRejection } from "../core/resource-request"
import { hookNow, type OAuthHookOptions } from "./request"
import { findConsent, findRefreshToken } from "./store"
import { asDate, readField, storedResources } from "./values"

export async function rejectRefresh(
	ctx: { context: unknown; body?: unknown; headers?: Headers | undefined },
	requested: readonly string[],
	options: OAuthHookOptions,
): Promise<void> {
	const raw = readField(ctx.body, "refresh_token")
	if (typeof raw !== "string" || raw === "") return
	const stored = await findRefreshToken(ctx, raw)
	if (stored === null) return // The provider answers invalid_grant for an unknown token.
	if (
		refreshResourceRejection({ requested, granted: storedResources(stored.resources) }) !== null
	) {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_target",
			error_description: "a refresh may not add a resource the grant did not have",
		})
	}
	const consent = await findConsent(ctx, stored.clientId, stored.userId)
	const rejection = grantLifetimeRejection({
		approvedAt: asDate(consent?.createdAt),
		now: hookNow(ctx, options),
		lifetimeSeconds: options.absoluteLifetimeSeconds,
	})
	if (rejection === null) return
	throw new APIError("BAD_REQUEST", {
		error: "invalid_grant",
		error_description:
			rejection === "grant-expired"
				? "the grant's absolute lifetime has ended; approve the client again"
				: "the grant has no recorded approval; approve the client again",
	})
}
