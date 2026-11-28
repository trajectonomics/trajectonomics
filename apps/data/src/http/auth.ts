import type { JSONWebKeySet } from "jose"
import { sha256Hex } from "../core/hash"
import { resolveSender } from "../core/sender"
import { DATA_AUDIENCE, INGEST_SCOPE, verifyAccessToken } from "../core/token"
import type { Principal } from "../core/types"
import { readSender } from "../db/contributor"
import type { Env, RequestContext } from "../env"
import { JwksUnavailableError } from "./jwks"

// The token may be empty, so an unset bootstrap key still reports itself once (existing tests).
const BEARER = /^Bearer ?(.*)$/

/** Who an ingest may send as, or the status and error the body answers with. */
export type IngestAuthorization =
	| { ok: true; principal: Principal; bindOrgSub: string | null }
	| { ok: false; status: 401 | 403 | 503; error: string }

function failure(status: 401 | 403 | 503, error: string): IngestAuthorization {
	return { ok: false, status, error }
}

function constantTimeEqual(left: string, right: string): boolean {
	const a = new TextEncoder().encode(left)
	const b = new TextEncoder().encode(right)
	let diff = a.length ^ b.length
	const length = Math.max(a.length, b.length)
	for (let index = 0; index < length; index += 1) {
		diff |= (a[index] ?? 0) ^ (b[index] ?? 0)
	}
	return diff === 0
}

async function readKeys(
	source: RequestContext["jwks"],
	env: Env,
	context: RequestContext,
	refresh: boolean,
): Promise<JSONWebKeySet | null> {
	if (source === undefined) return null
	try {
		return await source.get(env.AUTH_ISSUER, context.nowMs, { refresh })
	} catch (error) {
		if (error instanceof JwksUnavailableError) return null
		throw error
	}
}

/** Verifies auth's JWT, then resolves its `sub` to the contributor it sends as (ADR 0015). */
async function authorizeJwt(
	token: string,
	env: Env,
	context: RequestContext,
): Promise<IngestAuthorization> {
	const first = await readKeys(context.jwks, env, context, false)
	if (first === null) return failure(503, "auth_unavailable")
	const input = {
		issuer: env.AUTH_ISSUER,
		audience: DATA_AUDIENCE,
		requiredScope: INGEST_SCOPE,
		nowSeconds: Math.floor(context.nowMs / 1000),
	}
	let verified = await verifyAccessToken(token, { ...input, jwks: first })
	if (!verified.ok && verified.reason === "unknown_kid") {
		const refreshed = await readKeys(context.jwks, env, context, true)
		if (refreshed === null) return failure(503, "auth_unavailable")
		verified = await verifyAccessToken(token, { ...input, jwks: refreshed })
	}
	if (!verified.ok) return failure(401, "unauthorized")
	const sub = verified.sub
	const sender = resolveSender({
		sub,
		lookup: await readSender(env.DB, sub, await sha256Hex(sub)),
		orgAuthUserId: env.ORG_AUTH_USER_ID,
	})
	if (sender.kind === "rejected") return failure(403, sender.error)
	return { ok: true, principal: sender.principal, bindOrgSub: sender.bindOrg ? sub : null }
}

/** The temporary shared key, which still sends as the org until it is retired (ADR 0015). */
function authorizeBootstrap(token: string, env: Env): IngestAuthorization {
	const expected = env.INGEST_BOOTSTRAP_KEY
	if (typeof expected !== "string" || expected.length === 0) {
		// Visible on the first request, without ever printing the key or the bearer token.
		console.error("INGEST_BOOTSTRAP_KEY is not set")
		return failure(401, "unauthorized")
	}
	if (!constantTimeEqual(token, expected)) return failure(401, "unauthorized")
	return {
		ok: true,
		principal: { contributorId: "trajectonomics", series: "measured-by-us" },
		bindOrgSub: null,
	}
}

/** Resolves the bearer token to the contributor it sends as; the body never names one. */
export async function authorizeIngest(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<IngestAuthorization> {
	const match = BEARER.exec(request.headers.get("authorization") ?? "")
	if (match === null) return failure(401, "unauthorized")
	const token = match[1] ?? ""
	if (token.split(".").length === 3) return authorizeJwt(token, env, context)
	return authorizeBootstrap(token, env)
}
