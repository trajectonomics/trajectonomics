import { sha256Hex } from "../core/hash"
import { resolveSender } from "../core/sender"
import { DATA_AUDIENCE, INGEST_SCOPE, verifyAccessToken } from "../core/token"
import type { Principal } from "../core/types"
import { equalConstantTime } from "../core/web-auth"
import { readSender } from "../db/contributor"
import type { Env, RequestContext } from "../env"
import { type JwksResult, JwksUnavailableError } from "./jwks"

// A space must follow `Bearer`, so `Bearertest-key` is refused; an unset key still reports itself.
const BEARER = /^Bearer(?: (.*))?$/

/** Who an ingest may send as, or the status and error the body answers with. */
export type IngestAuthorization =
	| { ok: true; principal: Principal; bind: { sub: string; subHash: string } | null }
	| { ok: false; status: 401 | 403 | 503; error: string }

function failure(status: 401 | 403 | 503, error: string): IngestAuthorization {
	return { ok: false, status, error }
}

async function readKeys(
	source: RequestContext["jwks"],
	env: Env,
	context: RequestContext,
	refresh: boolean,
): Promise<JwksResult | null> {
	if (source === undefined) return null
	try {
		return await source.get(env.AUTH_ISSUER, context.nowMs, { refresh })
	} catch (error) {
		if (error instanceof JwksUnavailableError) return null
		throw error
	}
}

/** A verified token's subject, or the status the caller answers instead (ADR 0015). */
export type TokenCheck = { ok: true; sub: string } | { ok: false; status: 401 | 503 }

/**
 * Verifies auth's JWT against its JWKS, refetching once for an unknown `kid`. Ingest requires its
 * scope; the browser callback passes null, because the web client asks only for `openid`.
 */
export async function verifyWithKeys(
	token: string,
	env: Env,
	context: RequestContext,
	requiredScope: string | null,
): Promise<TokenCheck> {
	const first = await readKeys(context.jwks, env, context, false)
	if (first === null) return { ok: false, status: 503 }
	const input = {
		issuer: env.AUTH_ISSUER,
		audience: DATA_AUDIENCE,
		requiredScope,
		nowSeconds: Math.floor(context.nowMs / 1000),
	}
	let verified = await verifyAccessToken(token, { ...input, jwks: first.set })
	// A set fetched during this request already is auth's current one, so a missing kid is a 401.
	if (!verified.ok && verified.reason === "unknown_kid" && !first.fetched) {
		const refreshed = await readKeys(context.jwks, env, context, true)
		// A suppressed refresh is retried next hour, so it is unavailable rather than signed out.
		if (refreshed === null || !refreshed.fetched) return { ok: false, status: 503 }
		verified = await verifyAccessToken(token, { ...input, jwks: refreshed.set })
	}
	if (!verified.ok) return { ok: false, status: 401 }
	return { ok: true, sub: verified.sub }
}

/** Verifies auth's JWT, then resolves its `sub` to the contributor it sends as (ADR 0015). */
async function authorizeJwt(
	token: string,
	env: Env,
	context: RequestContext,
): Promise<IngestAuthorization> {
	const check = await verifyWithKeys(token, env, context, INGEST_SCOPE)
	if (!check.ok) {
		return check.status === 503 ? failure(503, "auth_unavailable") : failure(401, "unauthorized")
	}
	const sub = check.sub
	const subHash = await sha256Hex(sub)
	const sender = resolveSender({
		sub,
		lookup: await readSender(env.DB, sub, subHash),
		orgAuthUserId: env.ORG_AUTH_USER_ID,
	})
	if (sender.kind === "rejected") return failure(403, sender.error)
	return { ok: true, principal: sender.principal, bind: sender.bindOrg ? { sub, subHash } : null }
}

/** The temporary shared key, which still sends as the org until it is retired (ADR 0015). */
function authorizeBootstrap(token: string, env: Env): IngestAuthorization {
	const expected = env.INGEST_BOOTSTRAP_KEY
	if (typeof expected !== "string" || expected.length === 0) {
		// Visible on the first request, without ever printing the key or the bearer token.
		console.error("INGEST_BOOTSTRAP_KEY is not set")
		return failure(401, "unauthorized")
	}
	if (!equalConstantTime(token, expected)) return failure(401, "unauthorized")
	return {
		ok: true,
		principal: { contributorId: "trajectonomics", series: "measured-by-us" },
		bind: null,
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
