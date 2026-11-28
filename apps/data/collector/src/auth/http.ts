/** The part of a fetch response the auth client reads. */
export type AuthResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/** The POST-only fetch signature the auth client needs; tests inject a fake. */
export type AuthFetch = (
	url: string,
	init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<AuthResponse>

/** Auth accepts this media type exactly, with no charset parameter. */
export const FORM_MEDIA_TYPE = "application/x-www-form-urlencoded"

/** POSTs a form body to an auth endpoint. */
export function postForm(
	fetchFn: AuthFetch,
	url: string,
	fields: Record<string, string>,
): Promise<AuthResponse> {
	return fetchFn(url, {
		method: "POST",
		headers: { "Content-Type": FORM_MEDIA_TYPE },
		body: new URLSearchParams(fields).toString(),
	})
}

/** Reads a JSON body, or null when the response is not JSON. */
export async function responseBody(response: AuthResponse): Promise<unknown> {
	try {
		return await response.json()
	} catch {
		return null
	}
}

/** The `error` code in an OAuth error body, or null. */
export function oauthErrorCode(body: unknown): string | null {
	if (typeof body !== "object" || body === null || Array.isArray(body)) return null
	const error = (body as Record<string, unknown>)["error"]
	return typeof error === "string" && error.length > 0 ? error : null
}
