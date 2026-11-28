/** The part of a fetch response the auth client reads. */
export type AuthResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/** What the auth client passes to fetch: POST only, no redirects, bounded in time. */
export type AuthInit = {
	method: "POST"
	headers: Record<string, string>
	body: string
	signal: AbortSignal
	redirect: "error"
}

/** The POST-only fetch signature the auth client needs; tests inject a fake. */
export type AuthFetch = (url: string, init: AuthInit) => Promise<AuthResponse>

/** Auth accepts this media type exactly, with no charset parameter. */
export const FORM_MEDIA_TYPE = "application/x-www-form-urlencoded"

/** No auth call may hang a run on a stalled socket. */
export const AUTH_TIMEOUT_MS = 10_000

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
		signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
		redirect: "error",
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
