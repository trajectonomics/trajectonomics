import type { D1Database } from "@cloudflare/workers-types"
import { APIError } from "better-auth/api"
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
	/** The D1 binding, for the grant clean-up that is one SQL statement rather than a scan. */
	database: D1Database
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
 * True when `ctx.request` really is the request to the endpoint being hooked.
 *
 * The OAuth provider re-dispatches `/oauth2/authorize` internally after a sign-in and after
 * `/oauth2/consent`; on those passes the context keeps `path: "/oauth2/authorize"` but the request
 * is still the sign-in or consent request. Reading that request's body as an authorize body would
 * misread it, and rejecting its POST would break the resume. The real request's pathname always
 * ends with the endpoint path.
 */
export function isEndpointRequest(ctx: {
	path?: string | undefined
	request?: Request | undefined
}): boolean {
	if (ctx.request === undefined) return true
	if (ctx.path === undefined || ctx.path === "") return false
	let pathname: string
	try {
		pathname = new URL(ctx.request.url).pathname
	} catch {
		// A request whose URL cannot be read is not provably a re-dispatch; treat it as the endpoint.
		return true
	}
	return normalizePath(pathname).endsWith(normalizePath(ctx.path))
}

function normalizePath(path: string): string {
	return path.replace(/\/+/g, "/").replace(/\/+$/, "")
}

/**
 * The `client_id` an authorization request carries, from wherever it carries it: the query (the
 * library's own resume after sign-in puts the authorize query there), a form body (a POST, which
 * is rejected, but the value is still read) or the signed `oauth_query` of `/oauth2/consent` and
 * `/oauth2/continue`.
 */
export function authorizationClientId(ctx: {
	body?: unknown
	query?: unknown
}): string | undefined {
	for (const source of [ctx.query, ctx.body]) {
		const value = readField(source, "client_id")
		if (typeof value === "string" && value !== "") return value
	}
	const oauthQuery = readField(ctx.body, "oauth_query")
	if (typeof oauthQuery !== "string") return undefined
	const value = new URLSearchParams(oauthQuery).get("client_id")
	return value === null || value === "" ? undefined : value
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
 *
 * A body that cannot be read throws: this check must fail closed rather than assume the body held
 * no `resource`. A re-dispatched authorize has its parameters in the query, so it never reads the
 * body of the request that triggered it.
 */
export async function requestResourceValues(ctx: {
	path?: string | undefined
	body?: unknown
	query?: unknown
	request?: Request | undefined
}): Promise<string[]> {
	const endpointRequest = isEndpointRequest(ctx)
	const fromRequestQuery = endpointRequest ? queryResources(ctx.request) : []
	const fromRawBody = endpointRequest ? await rawBodyResources(ctx.request) : []
	const fromBody = endpointRequest ? resourceValues(readField(ctx.body, "resource")) : []
	return mergeResourceSources([
		fromRequestQuery,
		resourceValues(readField(ctx.query, "resource")),
		fromRawBody,
		fromBody,
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
async function rawBodyResources(request: Request | undefined): Promise<string[]> {
	if (request === undefined || request.method === "GET" || request.method === "HEAD") return []
	const mediaType = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase()
	if (mediaType === "application/x-www-form-urlencoded") return formResources(request)
	if (mediaType === "application/json" || mediaType?.endsWith("+json") === true) {
		return jsonResources(request)
	}
	return []
}

async function formResources(request: Request): Promise<string[]> {
	const text = await readRequestBody(() => request.clone().text())
	return new URLSearchParams(text).getAll("resource")
}

async function jsonResources(request: Request): Promise<string[]> {
	const body = await readRequestBody(() => request.clone().json() as Promise<unknown>)
	if (body === null || typeof body !== "object") return []
	return resourceValues((body as Record<string, unknown>)["resource"])
}

async function readRequestBody<T>(read: () => Promise<T>): Promise<T> {
	try {
		return await read()
	} catch {
		throw new APIError("BAD_REQUEST", {
			error: "invalid_request",
			error_description: "the request body could not be read",
		})
	}
}
