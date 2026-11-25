import type { Principal } from "../core/types"
import type { Env } from "../env"

const BEARER = /^Bearer (.+)$/

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

/** Resolves the ingest key to the contributor it owns; the body never names one. */
export function authorizeIngest(request: Request, env: Env): Principal | null {
	const expected = env.INGEST_BOOTSTRAP_KEY
	if (typeof expected !== "string" || expected.length === 0) {
		// Visible on the first request, without ever printing the key or the bearer token.
		console.error("INGEST_BOOTSTRAP_KEY is not set")
		return null
	}
	const match = BEARER.exec(request.headers.get("authorization") ?? "")
	if (match === null) return null
	if (!constantTimeEqual(match[1] ?? "", expected)) return null
	return { contributorId: "trajectonomics", series: "measured-by-us" }
}
