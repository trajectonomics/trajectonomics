import { routeRequest } from "../core/route"
import type { Env, RequestContext } from "../env"
import { handleHealth } from "./health"
import { handleIngest } from "./ingest"
import { handleDeleteContributor } from "./internal"
import { handlePeaks } from "./peaks"
import { json, methodNotAllowed, permanentRedirect } from "./responses"
import { handleUsage } from "./usage"

/**
 * Routes the requests the assets binding sends to the Worker, at the address they arrived on:
 * the apex's `/data/api/*` and `/data/ingest`, and the old host's API, ingest and page redirects.
 */
export function handleRequest(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const url = new URL(request.url)
	const route = routeRequest({
		hostname: url.hostname,
		pathname: url.pathname,
		search: url.search,
		method: request.method,
	})
	switch (route.kind) {
		case "usage":
			return handleUsage(request, env, context)
		case "peaks":
			return handlePeaks(request, env, context)
		case "health":
			return handleHealth(request, env, context)
		case "ingest":
			return handleIngest(request, env, context)
		case "delete_contributor":
			return handleDeleteContributor(request, env, context)
		case "redirect":
			return Promise.resolve(permanentRedirect(route.location))
		case "method_not_allowed":
			return Promise.resolve(methodNotAllowed(route.allow))
		case "not_found":
			return Promise.resolve(json({ error: "not_found" }, { status: 404 }))
	}
}
