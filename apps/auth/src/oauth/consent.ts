/**
 * The `/device/approve` before-hook: record the approval before the endpoint marks the code
 * `approved`, so no poll can redeem a code whose consent row does not exist yet.
 */
import { APIError, getAuthoritativeSessionFromCtx } from "better-auth/api"
import { deviceApprovalRejection } from "../core/consent"
import { rememberDeviceApproval } from "./approval"
import { recordConsent } from "./consent-record"
import { hookNow, type OAuthHookOptions } from "./request"
import { findDeviceCode, type StoredDeviceCode } from "./store"
import { asDate, deviceScopes, readField, storedResources } from "./values"

type ApprovalOwner = { userId: string; clientId: string }
type ApprovalCheck =
	| { kind: "ok"; owner: ApprovalOwner }
	| { kind: "skip" }
	| { kind: "no-scope" }
	| { kind: "not-owner" }

/**
 * Records the consent for a device approval before the endpoint flips the code to `approved`.
 * The endpoint itself re-checks the same conditions; acting only when they hold means no consent
 * is recorded for a request that cannot be approved. A signed-in user who does not own the code
 * is refused here rather than skipped, and a code that would approve with no scope throws:
 * otherwise its poll could redeem it with no approval record.
 */
export async function recordDeviceApprovalConsent(
	ctx: { context: unknown; headers?: Headers | undefined; body?: unknown },
	options: OAuthHookOptions,
): Promise<void> {
	const userCode = readField(ctx.body, "userCode")
	if (typeof userCode !== "string") return
	const device = await findDeviceCode(ctx, userCode)
	if (device === null) return
	const session = await getAuthoritativeSessionFromCtx(
		ctx as Parameters<typeof getAuthoritativeSessionFromCtx>[0],
	)
	const check = approvalCheck(session?.user?.id, device, hookNow(ctx, options))
	if (check.kind === "not-owner") {
		throw new APIError("FORBIDDEN", {
			error: "access_denied",
			error_description: "You are not authorized to approve this device authorization",
		})
	}
	if (check.kind === "no-scope") {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: "the device request must name a scope",
		})
	}
	if (check.kind === "skip") return
	const write = await recordConsent(
		ctx,
		{
			clientId: check.owner.clientId,
			userId: check.owner.userId,
			scopes: deviceScopes(device.scope),
			resources: storedResources(device.resources),
		},
		options,
	)
	rememberDeviceApproval(ctx, { userCode, userId: check.owner.userId, write })
}

function approvalCheck(sessionUserId: unknown, device: StoredDeviceCode, now: Date): ApprovalCheck {
	const rejection = deviceApprovalRejection({
		sessionUserId: typeof sessionUserId === "string" ? sessionUserId : undefined,
		deviceUserId: typeof device.userId === "string" ? device.userId : undefined,
		status: typeof device.status === "string" ? device.status : undefined,
		expiresAt: asDate(device.expiresAt),
		scope: device.scope,
		now,
	})
	if (rejection === "no-scope") return { kind: "no-scope" }
	if (rejection === "not-owner") return { kind: "not-owner" }
	if (rejection !== null) return { kind: "skip" }
	if (typeof sessionUserId !== "string" || sessionUserId === "") return { kind: "skip" }
	if (typeof device.clientId !== "string" || device.clientId === "") return { kind: "skip" }
	return { kind: "ok", owner: { userId: sessionUserId, clientId: device.clientId } }
}
