import { MAX_INGEST_BYTES } from "../core/rules"
import { validateIngest } from "../core/validate"
import { writeIngest } from "../db/ingest"
import type { Env, RequestContext } from "../env"
import { authorizeIngest } from "./auth"
import { json, methodNotAllowed } from "./responses"

function tooLarge(): Response {
	return json({ error: "payload_too_large" }, { status: 413 })
}

function unauthorized(): Response {
	return json({ error: "unauthorized" }, { status: 401 })
}

async function readBody(request: Request): Promise<ArrayBuffer | null> {
	const declared = request.headers.get("content-length")
	if (declared !== null && Number(declared) > MAX_INGEST_BYTES) return null
	const bytes = await request.arrayBuffer()
	return bytes.byteLength > MAX_INGEST_BYTES ? null : bytes
}

/** Handles `POST /ingest`: authenticate, validate the whole body, then write it atomically. */
export async function handleIngest(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "POST") return methodNotAllowed("POST")
	const principal = authorizeIngest(request, env)
	if (principal === null) return unauthorized()
	const bytes = await readBody(request)
	if (bytes === null) return tooLarge()
	let body: unknown
	try {
		body = JSON.parse(new TextDecoder().decode(bytes))
	} catch {
		return json({ error: "invalid_json" }, { status: 400 })
	}
	const validation = validateIngest(body, principal, context.nowMs)
	if (!validation.ok) {
		const tooMany = validation.errors.some((error) => error.code === "TOO_MANY_ROWS")
		return json(
			{ error: tooMany ? "payload_too_large" : "invalid_batch", errors: validation.errors },
			{ status: tooMany ? 413 : 400 },
		)
	}
	try {
		const outcome = await writeIngest(
			env.DB,
			validation.batch,
			new Date(context.nowMs).toISOString(),
		)
		return json({ accepted: outcome.accepted, days: outcome.days })
	} catch (error) {
		console.error("data: ingest failed", error)
		return json({ error: "storage_error" }, { status: 500 })
	}
}
