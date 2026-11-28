import type { IngestValidation } from "../core/errors"
import { MAX_INGEST_BYTES } from "../core/rules"
import { validateIngest } from "../core/validate"
import { writeIngest } from "../db/ingest"
import type { Env, RequestContext } from "../env"
import { authorizeIngest, type IngestAuthorization } from "./auth"
import { readBody } from "./body"
import { json, methodNotAllowed } from "./responses"

function tooLarge(): Response {
	return json({ error: "payload_too_large" }, { status: 413 })
}

function rejectedBatch(validation: Extract<IngestValidation, { ok: false }>): Response {
	const tooMany = validation.errors.some((error) => error.code === "TOO_MANY_ROWS")
	return json(
		{ error: tooMany ? "payload_too_large" : "invalid_batch", errors: validation.errors },
		{ status: tooMany ? 413 : 400 },
	)
}

/** The authentication step, with an unexpected storage failure mapped to 500. */
async function authenticate(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<IngestAuthorization | Response> {
	try {
		return await authorizeIngest(request, env, context)
	} catch (error) {
		// Never log the bearer token or an auth user id.
		console.error("data: ingest authentication failed", error)
		return json({ error: "storage_error" }, { status: 500 })
	}
}

/**
 * Handles `POST /data/ingest` (and the old host's `/ingest`): authenticate, validate the whole
 * body, then write it atomically. The body is read only after the token is accepted.
 */
export async function handleIngest(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "POST") return methodNotAllowed("POST")
	const authorization = await authenticate(request, env, context)
	if (authorization instanceof Response) return authorization
	if (!authorization.ok)
		return json({ error: authorization.error }, { status: authorization.status })
	const bytes = await readBody(request, MAX_INGEST_BYTES)
	if (bytes === null) return tooLarge()
	let body: unknown
	try {
		body = JSON.parse(new TextDecoder().decode(bytes))
	} catch {
		return json({ error: "invalid_json" }, { status: 400 })
	}
	const validation = validateIngest(body, authorization.principal, context.nowMs)
	if (!validation.ok) return rejectedBatch(validation)
	try {
		const outcome = await writeIngest(
			env.DB,
			validation.batch,
			new Date(context.nowMs).toISOString(),
			authorization.bindOrgSub,
		)
		return json({ accepted: outcome.accepted, days: outcome.days })
	} catch (error) {
		console.error("data: ingest failed", error)
		return json({ error: "storage_error" }, { status: 500 })
	}
}
