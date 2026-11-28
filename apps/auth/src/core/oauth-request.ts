/**
 * Decision rules for the shape of an OAuth request, before the library parses it.
 *
 * Better Auth 1.7.28 form-parses a body whenever `Content-Type` *contains*
 * `application/x-www-form-urlencoded`, and the authorize endpoint accepts POST. Both let a client
 * smuggle values past a hook that reads only the parsed body: a JSON string body can hide a
 * second `resource`, and a repeated form field collapses to its last value. These rules reject
 * the shapes before the library sees them.
 *
 * This module is pure: no I/O, no clock, no environment.
 */

const FORM_MEDIA_TYPE = "application/x-www-form-urlencoded"

export type FormMediaTypeRejection = "smuggled-form-media-type"

/**
 * Rejects a Content-Type whose media type only *contains* the form media type. A parameter such
 * as `; charset=UTF-8` is allowed: the media type is still exactly form. A JSON body advertised
 * as `application/json; x=application/x-www-form-urlencoded` is not: the library would parse it as
 * a form while the hook reads JSON, and the two disagree about what the request asked for.
 */
export function formMediaTypeRejection(
	contentType: string | null | undefined,
): FormMediaTypeRejection | null {
	if (contentType === null || contentType === undefined) return null
	const lower = contentType.toLowerCase()
	if (!lower.includes(FORM_MEDIA_TYPE)) return null
	const mediaType = lower.split(";")[0]?.trim() ?? ""
	return mediaType === FORM_MEDIA_TYPE ? null : "smuggled-form-media-type"
}

export type DeviceScopeRejection = "scope-required"

/** A device authorization request must name at least one scope. */
export function deviceScopeRejection(scope: unknown): DeviceScopeRejection | null {
	if (typeof scope !== "string") return "scope-required"
	return scope.trim() === "" ? "scope-required" : null
}

export type DeviceApproveBodyRejection = "unexpected-field"

/**
 * A `/device/approve` body carries `userCode` and nothing else. The provider's own before-hook
 * runs after ours and throws on a body with `oauth_query` whose signature fails; a throw there
 * skips the after-hook, so the consent our hook wrote would never be taken back. The first-party
 * page sends only `userCode`, so any other field is refused before anything is written.
 */
export function deviceApproveBodyRejection(body: unknown): DeviceApproveBodyRejection | null {
	if (typeof body !== "object" || body === null) return null
	return Object.keys(body).every((key) => key === "userCode") ? null : "unexpected-field"
}

export type ClaimsParameterRejection = "claims-parameter"

/**
 * OIDC's `claims` request parameter is refused, and this check must not be relaxed. The library
 * does resolve a request's claims object for an opaque access token: its userinfo answer releases
 * a claim when the granted scopes include the claim's scope or when the request named it, so a
 * client granted only `openid`, asking without a `resource`, that sends
 * `claims={"userinfo":{"email":null}}` would receive the email from `/userinfo`, which the consent
 * screen never showed. A JWT access token, which a `resource` selects, resolves userinfo claims by
 * scope alone. Refusing the parameter is what keeps a token to the claims the consent screen
 * shows, whichever format the library issues. Any value counts, including an empty one, and every
 * source that can hold the field is read.
 */
export function claimsParameterRejection(
	...sources: readonly unknown[]
): ClaimsParameterRejection | null {
	return sources.some(carriesClaims) ? "claims-parameter" : null
}

function carriesClaims(source: unknown): boolean {
	if (source instanceof URLSearchParams) return source.has("claims")
	return typeof source === "object" && source !== null && Object.hasOwn(source, "claims")
}

export type AuthorizeMethodRejection = "post-authorize"

/**
 * POST `/oauth2/authorize` is rejected. No first-party client posts the authorization request,
 * and the library parses a POST body before the before-hook runs, so a repeated `resource` in that
 * body collapses to one value and the gate cannot count it. `isEndpointRequest` keeps an internal
 * re-dispatch of the authorize endpoint (the resume after sign-in) from being mistaken for a
 * client's POST: there the real request is the sign-in, and the authorization parameters live in
 * the query.
 */
export function authorizeMethodRejection(input: {
	method: string | undefined
	isEndpointRequest: boolean
}): AuthorizeMethodRejection | null {
	if (!input.isEndpointRequest) return null
	return input.method?.toUpperCase() === "POST" ? "post-authorize" : null
}
