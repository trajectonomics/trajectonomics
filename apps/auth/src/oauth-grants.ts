/**
 * Session-scoped grant management for gate 3. Better Auth 1.7.28 has `/oauth2/get-consents` and
 * `/oauth2/delete-consent`, but deleting a consent does not revoke the refresh tokens issued from
 * it. `/oauth2/delete-consent` is therefore disabled in `auth-options.ts`, and this plugin adds one
 * list endpoint and one revoke endpoint that delete the token family, the pending device codes and
 * the pending authorization codes as well. Both require the signed-in owner; neither is an admin
 * endpoint.
 *
 * A grant is one consent per user and client, which is also how 1.7.28's refresh-token family is
 * keyed. Revoking it deletes every consent row for that user and client, so a duplicate cannot
 * outlive the revoke, and then the codes and the token family.
 */

import type { D1Database } from "@cloudflare/workers-types"
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api"
import { findAllPages } from "./oauth/adapter"
import { asIsoString, stringArray } from "./oauth/format"
import { revokeGrantFamily } from "./oauth/revoke"

type StoredConsent = {
	id: string
	clientId: string
	userId?: string | null
	scopes?: unknown
	resources?: unknown
	createdAt?: unknown
}

type StoredClient = {
	clientId: string
	name?: string | null
}

export function grantManagement(input: { database: D1Database }) {
	return {
		id: "grant-management",
		endpoints: {
			listGrants: createAuthEndpoint(
				"/oauth2/grants",
				{ method: "GET", use: [sessionMiddleware] },
				async (ctx) => {
					const userId = ctx.context.session.user.id
					// Paged: the adapter's default limit is 100 rows, and a missing grant would be a
					// grant the owner cannot see or revoke.
					const consents = await findAllPages<StoredConsent>(ctx, "oauthConsent", [
						{ field: "userId", value: userId },
					])
					const grants = await Promise.all(
						consents.map(async (consent) => {
							const client = (await ctx.context.adapter.findOne({
								model: "oauthClient",
								where: [{ field: "clientId", value: consent.clientId }],
							})) as StoredClient | null
							return {
								id: consent.id,
								clientId: consent.clientId,
								clientName: client?.name ?? consent.clientId,
								createdAt: asIsoString(consent.createdAt),
								scopes: stringArray(consent.scopes),
								resources: stringArray(consent.resources),
							}
						}),
					)
					grants.sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))
					return ctx.json({ grants })
				},
			),
			revokeGrant: createAuthEndpoint(
				"/oauth2/grants/revoke",
				{ method: "POST", use: [sessionMiddleware] },
				async (ctx) => {
					const userId = ctx.context.session.user.id
					const body = ctx.body as Record<string, unknown> | undefined
					const id = body?.["id"]
					if (typeof id !== "string" || id === "") {
						throw new APIError("BAD_REQUEST", {
							error: "invalid_request",
							error_description: "id is required",
						})
					}
					const consent = (await ctx.context.adapter.findOne({
						model: "oauthConsent",
						where: [{ field: "id", value: id }],
					})) as StoredConsent | null
					if (consent === null || consent.userId !== userId) {
						throw new APIError("NOT_FOUND", {
							error: "not_found",
							error_description: "grant not found",
						})
					}
					const owner = { userId, clientId: consent.clientId }
					// Every step is tried before the error: a failed step must not leave the rest of
					// the family alive. See `revoke.ts` for the order and why it is that order.
					const complete = await revokeGrantFamily(ctx, input.database, owner)
					if (!complete) {
						throw new APIError("INTERNAL_SERVER_ERROR", {
							error: "server_error",
							error_description: "the grant could not be fully revoked",
						})
					}
					return ctx.json({ revoked: true })
				},
			),
		},
	}
}
