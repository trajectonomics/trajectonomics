import type { Language } from "../language/language"

/** One probe: the request the local Worker is asked, and the answer it must give. */
export interface Probe {
	readonly path: string
	readonly acceptLanguage: string | null
	readonly country: string | null
	readonly followRedirects: boolean
	readonly status: number
	readonly location: string | null
	readonly language: Language | null
}

/** What the local Worker answered for one probe, reduced to the facts the probe judges. */
export interface ProbeResponse {
	readonly probe: Probe
	readonly status: number
	readonly location: string | null
	readonly setCookie: string | null
	readonly contentSecurityPolicy: string | null
	readonly html: string
}

/** Stable codes for every way the local Worker can fail the probe. One code per rule. */
export type ProbeFailureCode =
	| "PROBE_STATUS_WRONG"
	| "ROOT_LOCATION_WRONG"
	| "PAGE_LANGUAGE_WRONG"
	| "PROBE_NOT_ASKED"
	| "SET_COOKIE_PRESENT"
	| "CONTENT_SECURITY_POLICY_PRESENT"

/** One failed probe rule: the rule's code, the path it concerns and a line a maintainer can act on. */
export interface ProbeFailure {
	readonly code: ProbeFailureCode
	readonly path: string
	readonly message: string
}

/** A request for `/`, which must redirect to `location` for the Visitor signals given. */
function redirectTo(
	acceptLanguage: string | null,
	country: string | null,
	location: string,
): Probe {
	return {
		path: "/",
		acceptLanguage,
		country,
		followRedirects: false,
		status: 302,
		location,
		language: null,
	}
}

/** A request for a built path, which must answer with `status`, in `language` when given one. */
function answered(
	path: string,
	status: number,
	language: Language | null,
	followRedirects = false,
): Probe {
	return {
		path,
		acceptLanguage: null,
		country: null,
		followRedirects,
		status,
		location: null,
		language,
	}
}

/** Every probe the local Worker must answer: the redirect, both homes and every kind of miss. */
export const PROBES: readonly Probe[] = Object.freeze([
	redirectTo("th", null, "/th/"),
	redirectTo(null, "TH", "/th/"),
	redirectTo(null, null, "/en/"),
	redirectTo("en", "TH", "/en/"),
	answered("/th/", 200, "th"),
	answered("/en/", 200, "en"),
	answered("/th", 200, "th", true),
	answered("/th/no-such-page", 404, "th"),
	answered("/no-such-page", 404, "en"),
	answered("/__mf-preload.js", 404, null),
])
