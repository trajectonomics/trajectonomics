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

/** Reads the body through a counting reader; `Content-Length` never decides the limit. */
async function readBody(request: Request): Promise<Uint8Array | null> {
	if (request.body === null) return new Uint8Array(0)
	const reader = request.body.getReader()
	const chunks: Uint8Array[] = []
	let total = 0
	try {
		for (;;) {
			const { done, value } = await reader.read()
			if (done) break
			total += value.byteLength
			if (total > MAX_INGEST_BYTES) {
				await reader.cancel()
				return null
			}
			chunks.push(value)
		}
	} finally {
		reader.releaseLock()
	}
	const bytes = new Uint8Array(total)
	let offset = 0
	for (const chunk of chunks) {
		bytes.set(chunk, offset)
		offset += chunk.byteLength
	}
	return bytes
}

/**
 * Handles `POST /data/ingest` (and the old host's `/ingest`): authenticate, validate the whole
 * body, then write it atomically.
 */
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
