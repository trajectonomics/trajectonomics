import type { Env, RequestContext } from "../env"
import { handleHealth } from "./health"
import { handleIngest } from "./ingest"
import { json } from "./responses"
import { handleUsage } from "./usage"

/** Routes the paths the assets binding sends to the Worker; the rest are assets. */
export function handleRequest(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const { pathname } = new URL(request.url)
	if (pathname === "/ingest") return handleIngest(request, env, context)
	if (pathname === "/api/usage") return handleUsage(request, env, context)
	if (pathname === "/api/health") return handleHealth(request, env, context)
	return Promise.resolve(json({ error: "not_found" }, { status: 404 }))
}
