import { mergeResourceSources, resourceValues } from "../core/resource-request"
import { readField } from "./values"

export type OAuthHookOptions = {
	/** The grant's absolute lifetime in seconds. Production always passes ninety days. */
	absoluteLifetimeSeconds: number
	/**
	 * Honor `x-spike-now` as the clock. Only the spike's dev sign-in gate turns this on:
	 * `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback `BETTER_AUTH_URL`.
	 */
	testClock: boolean
}

/** True only when a dev sign-in deployment may read the spike's test clock header. */
export function testClockEnabled(devSignIn: boolean): boolean {
	return devSignIn
}

export function hookNow(ctx: { headers?: Headers | undefined }, options: OAuthHookOptions): Date {
	if (!options.testClock) return new Date()
	const header = ctx.headers?.get("x-spike-now")
	if (header === null || header === undefined || header === "") return new Date()
	const parsed = new Date(header)
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

/**
 * Reads every `resource` value the request carried, from every source that can hold one:
 *
 * - the query string (`?resource=`);
 * - the raw body, parsed as a form or as JSON by its exact media type;
 * - `ctx.body`, the library's parsed body (a JSON array, or a form value the schema kept).
 *
 * Better Auth's endpoint schema can strip an unknown field before the hook sees `ctx.body`, and
 * a JSON body sent with a misleading `Content-Type` hides its array from the form parser. Reading
 * all sources and merging them (see `mergeResourceSources`) closes both holes; a value seen in
 * more than one representation of the same request still counts once.
 */
export async function requestResourceValues(ctx: {
	body?: unknown
	query?: unknown
	request?: Request | undefined
}): Promise<string[]> {
	return mergeResourceSources([
		queryResources(ctx.request),
		resourceValues(readField(ctx.query, "resource")),
		(await rawBodyResources(ctx.request)) ?? [],
		resourceValues(readField(ctx.body, "resource")),
	])
}

function queryResources(request: Request | undefined): string[] {
	if (request === undefined) return []
	return new URL(request.url).searchParams.getAll("resource")
}

/**
 * Parses the raw body when its media type is one this hook understands. The media type is
 * matched exactly up to its first `;`, never with a substring test: a JSON body that claims
 * `application/json; x=application/x-www-form-urlencoded` is JSON, not a form.
 */
async function rawBodyResources(request: Request | undefined): Promise<string[] | null> {
	if (request === undefined || request.method === "GET" || request.method === "HEAD") return null
	const mediaType = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase()
	if (mediaType === "application/x-www-form-urlencoded") return formResources(request)
	if (mediaType === "application/json" || mediaType?.endsWith("+json") === true) {
		return jsonResources(request)
	}
	return null
}

async function formResources(request: Request): Promise<string[]> {
	try {
		const text = await request.clone().text()
		return new URLSearchParams(text).getAll("resource")
	} catch {
		return []
	}
}

async function jsonResources(request: Request): Promise<string[]> {
	try {
		const body = (await request.clone().json()) as Record<string, unknown> | null
		return resourceValues(body?.["resource"])
	} catch {
		return []
	}
}
