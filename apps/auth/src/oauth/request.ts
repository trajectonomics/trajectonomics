import { resourceValues } from "../core/resource-request"
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

/** Reads every `resource` value the raw request carried, including repeated form fields. */
export async function requestResourceValues(ctx: {
	body?: unknown
	query?: unknown
	request?: Request | undefined
}): Promise<string[]> {
	const values = [...queryResources(ctx.request), ...(await bodyResources(ctx.request))]
	if (values.length > 0) return values
	return [
		...resourceValues(readField(ctx.query, "resource")),
		...resourceValues(readField(ctx.body, "resource")),
	]
}

function queryResources(request: Request | undefined): string[] {
	if (request === undefined) return []
	return new URL(request.url).searchParams.getAll("resource")
}

async function bodyResources(request: Request | undefined): Promise<string[]> {
	if (request === undefined || request.method === "GET" || request.method === "HEAD") return []
	const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
	if (contentType.includes("application/x-www-form-urlencoded")) return formResources(request)
	if (contentType.includes("application/json")) return jsonResources(request)
	return []
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
