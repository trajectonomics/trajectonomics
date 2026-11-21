import type { Language } from "../language/language"

/** One probe: the request the local Worker is asked, and the answer it must give. */
export interface Probe {
	readonly path: string
	readonly acceptLanguage: string | null
	readonly country: string | null
	/** The `Cookie` header the request carries, or `null` when the visitor stored nothing. */
	readonly cookie: string | null
	readonly status: number
	readonly location: string | null
	readonly language: Language | null
	/** The media types the answer may declare, its parameters ignored; empty when it carries no body. */
	readonly mediaTypes: readonly string[]
	/** The directives the answer's `Vary` must name, or an empty list when the probe judges none. */
	readonly vary: readonly string[]
	/** The directives the answer's `Cache-Control` must name, or an empty list when it judges none. */
	readonly cacheControl: readonly string[]
	/** Whether the answer must carry an `ETag`, or `null` when the probe judges none. */
	readonly etag: boolean | null
	/** The Language choice the answer must store in exactly one cookie, or `null` for none. */
	readonly storesChoice: Language | null
}

/** What the local Worker answered for one probe, reduced to the facts the probe judges. */
export interface ProbeResponse {
	readonly probe: Probe
	readonly status: number
	readonly location: string | null
	/** Every `Set-Cookie` the answer carries, in the order it sent them. */
	readonly setCookies: readonly string[]
	readonly vary: string | null
	readonly cacheControl: string | null
	readonly etag: string | null
	readonly contentSecurityPolicy: string | null
	/** The `Content-Type` the answer declares, or `null` when it declares none. */
	readonly contentType: string | null
	readonly html: string
}

/** Stable codes for every way the local Worker can fail the probe. One code per rule. */
export type ProbeFailureCode =
	| "PROBE_STATUS_WRONG"
	| "PROBE_LOCATION_WRONG"
	| "PAGE_LANGUAGE_WRONG"
	| "PROBE_NOT_ASKED"
	| "PROBE_SET_COOKIE_PRESENT"
	| "PROBE_SET_COOKIE_MISSING"
	| "PROBE_SET_COOKIE_COUNT_WRONG"
	| "PROBE_SET_COOKIE_WRONG"
	| "PROBE_VARY_WRONG"
	| "PROBE_CACHE_CONTROL_WRONG"
	| "PROBE_ETAG_MISSING"
	| "CONTENT_SECURITY_POLICY_PRESENT"
	| "PROBE_CONTENT_TYPE_WRONG"

/** One failed probe rule: the rule's code, the path it concerns and a line a maintainer can act on. */
export interface ProbeFailure {
	readonly code: ProbeFailureCode
	readonly path: string
	readonly message: string
}

/** A frozen probe failure, so a caller cannot edit a check's verdict. */
export function probeFailure(code: ProbeFailureCode, path: string, message: string): ProbeFailure {
	return Object.freeze({ code, path, message })
}
