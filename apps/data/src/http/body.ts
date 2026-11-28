/** Reads a request body through a counting reader; `Content-Length` never decides the limit. */
export async function readBody(request: Request, limit: number): Promise<Uint8Array | null> {
	if (request.body === null) return new Uint8Array(0)
	const reader = request.body.getReader()
	const chunks: Uint8Array[] = []
	let total = 0
	try {
		for (;;) {
			const { done, value } = await reader.read()
			if (done) break
			total += value.byteLength
			if (total > limit) {
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
