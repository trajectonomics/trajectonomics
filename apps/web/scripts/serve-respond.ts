// How the loopback server answers one request ([ADR 0007](../docs/adr/0007-traj-dashboard-serves-the-dashboard-on-loopback.md)).
import { assetKeys, contentTypeOf, isLoopbackHost, SNAPSHOT_PATH } from "../src/lib/serve/route"
import type { Pack } from "./pack-format"

const HEADERS = {
	"cache-control": "no-store",
	"cross-origin-resource-policy": "same-origin",
	"referrer-policy": "no-referrer",
	"x-content-type-options": "nosniff",
	"x-frame-options": "DENY",
}

/** A plain-text answer with the same headers as every other. */
export function text(status: number, body: string): Response {
	return new Response(body, {
		status,
		headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" },
	})
}

/** A JSON answer with the same headers as every other: never cached, never read across origins. */
export function json(status: number, body: string): Response {
	return new Response(body, {
		status,
		headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" },
	})
}

/** Answers one request: the Snapshot, a packed file, or a refusal. Only this machine is served. */
export function respond(request: Request, pack: Pack, snapshot: string, port: number): Response {
	if (request.method !== "GET" && request.method !== "HEAD") return text(405, "Method not allowed")
	if (!isLoopbackHost(request.headers.get("host"), port)) return text(403, "Forbidden")
	const { pathname } = new URL(request.url)
	const json = "application/json; charset=utf-8"
	if (pathname === SNAPSHOT_PATH) {
		return new Response(snapshot, { headers: { ...HEADERS, "content-type": json } })
	}
	for (const key of assetKeys(pathname)) {
		const bytes = pack.get(key)
		if (bytes !== undefined) {
			return new Response(bytes, { headers: { ...HEADERS, "content-type": contentTypeOf(key) } })
		}
	}
	return text(404, "Not found")
}
