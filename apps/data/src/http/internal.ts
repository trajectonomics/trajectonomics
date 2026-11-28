import { sha256Hex } from "../core/hash"
import { MAX_DELETE_BYTES } from "../core/rules"
import { deleteContributor } from "../db/contributor"
import type { Env, RequestContext } from "../env"
import { readBody } from "./body"
import { json } from "./responses"

const MAX_USER_ID_LENGTH = 255

function invalid(): Response {
	return json({ error: "invalid_request" }, { status: 400 })
}

/** The body must be an object whose `authUserId` is a non-empty string of at most 255 characters. */
function authUserIdFrom(body: unknown): string | null {
	if (typeof body !== "object" || body === null || Array.isArray(body)) return null
	const value = (body as { authUserId?: unknown }).authUserId
	if (typeof value !== "string" || value.length === 0 || value.length > MAX_USER_ID_LENGTH) {
		return null
	}
	return value
}

/**
 * Handles auth's account-deletion notice on the `data.internal` host (ADR 0015): tombstone the id
 * and remove or unbind what it held. Idempotent, so auth's queue can stop retrying. Never logs the
 * id, its hash or the body.
 */
export async function handleDeleteContributor(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const bytes = await readBody(request, MAX_DELETE_BYTES)
	if (bytes === null) return json({ error: "payload_too_large" }, { status: 413 })
	let body: unknown
	try {
		body = JSON.parse(new TextDecoder().decode(bytes))
	} catch {
		return invalid()
	}
	const authUserId = authUserIdFrom(body)
	if (authUserId === null) return invalid()
	try {
		await deleteContributor(
			env.DB,
			authUserId,
			await sha256Hex(authUserId),
			new Date(context.nowMs).toISOString(),
		)
		return json({ deleted: true })
	} catch (error) {
		console.error("data: contributor deletion failed", error)
		return json({ error: "storage_error" }, { status: 500 })
	}
}
