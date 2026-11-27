/**
 * Session-scoped grant management for gate 3. Better Auth 1.7.28 has `/oauth2/get-consents` and
 * `/oauth2/delete-consent`, but deleting a consent does not revoke the refresh tokens issued from
 * it. `/oauth2/delete-consent` is therefore disabled in `auth-options.ts`, and this plugin adds one
 * list endpoint and one revoke endpoint that delete the token family, the pending device codes and
 * the pending authorization codes as well. Both require the signed-in owner; neither is an admin
 * endpoint.
 *
 * A grant is one consent per user and client, which is also how 1.7.28's refresh-token family is
 * keyed. Revoking it deletes that family, so the refresh token fails at once.
 */
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api"
import {
	deleteConsentRow,
	deleteDeviceCodes,
	deletePendingAuthorizationCodes,
	deleteTokenFamily,
} from "./oauth/family"
import { asIsoString, stringArray } from "./oauth/format"

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

export function grantManagement() {
	return {
		id: "grant-management",
		endpoints: {
			listGrants: createAuthEndpoint(
				"/oauth2/grants",
				{ method: "GET", use: [sessionMiddleware] },
				async (ctx) => {
					const userId = ctx.context.session.user.id
					const rows = await ctx.context.adapter.findMany({
						model: "oauthConsent",
						where: [{ field: "userId", value: userId }],
					})
					const consents = rows as StoredConsent[]
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
					// Consent first, then the rest: a concurrent rotation that slips through lands on a
					// grant with no approval record, and its next refresh fails closed (ADR 0002).
					await deleteConsentRow(ctx, id)
					await deleteTokenFamily(ctx, { userId, clientId: consent.clientId })
					await deleteDeviceCodes(ctx, { userId, clientId: consent.clientId })
					await deletePendingAuthorizationCodes(ctx, { userId, clientId: consent.clientId })
					return ctx.json({ revoked: true })
				},
			),
		},
	}
}
