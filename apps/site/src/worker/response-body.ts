/** The body to send: none for a HEAD, a 304 or a 204, and the assets' own bytes otherwise. */
export function bodyOf(request: Request, response: Response): ReadableStream<Uint8Array> | null {
	if (request.method === "HEAD" || response.status === 304 || response.status === 204) return null
	return response.body
}
