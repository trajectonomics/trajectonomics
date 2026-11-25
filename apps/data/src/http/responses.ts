/** Builds a JSON response with the package's content type. */
export function json(body: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers)
	headers.set("content-type", "application/json; charset=utf-8")
	return new Response(JSON.stringify(body), { ...init, headers })
}

/** A 405 that names the one method the route accepts. */
export function methodNotAllowed(allow: string): Response {
	return json({ error: "method_not_allowed" }, { status: 405, headers: { allow } })
}
