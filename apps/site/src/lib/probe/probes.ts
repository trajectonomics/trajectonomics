import { ROBOTS_FILE } from "../crawl/robots"
import { SITEMAP_FILE } from "../crawl/sitemap"
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
	/** The media types the answer may declare, its parameters ignored; empty when it carries no body. */
	readonly mediaTypes: readonly string[]
}

/** What the local Worker answered for one probe, reduced to the facts the probe judges. */
export interface ProbeResponse {
	readonly probe: Probe
	readonly status: number
	readonly location: string | null
	readonly setCookie: string | null
	readonly contentSecurityPolicy: string | null
	/** The `Content-Type` the answer declares, or `null` when it declares none. */
	readonly contentType: string | null
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
	| "PROBE_CONTENT_TYPE_WRONG"

/** One failed probe rule: the rule's code, the path it concerns and a line a maintainer can act on. */
export interface ProbeFailure {
	readonly code: ProbeFailureCode
	readonly path: string
	readonly message: string
}

/** The media types of an answer that carries no body, so no media type is judged on one. */
const NO_BODY: readonly string[] = Object.freeze([])

/** The media type every page answers with. */
const HTML: readonly string[] = Object.freeze(["text/html"])

/** The media types the Sitemap may answer with: the sitemaps protocol names both of them. */
const XML: readonly string[] = Object.freeze(["application/xml", "text/xml"])

/** The media type the Robots file answers with. */
const PLAIN_TEXT: readonly string[] = Object.freeze(["text/plain"])

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
		mediaTypes: NO_BODY,
	}
}

/** A request for a built path, which must answer with `status`, in `language`, as `mediaTypes`. */
function answered(
	path: string,
	status: number,
	language: Language | null,
	mediaTypes: readonly string[],
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
		mediaTypes,
	}
}

/** Every probe the local Worker must answer: the redirect, the homes, every kind of miss, both Crawler files. */
export const PROBES: readonly Probe[] = Object.freeze([
	redirectTo("th", null, "/th/"),
	redirectTo(null, "TH", "/th/"),
	redirectTo(null, null, "/en/"),
	redirectTo("en", "TH", "/en/"),
	answered("/th/", 200, "th", HTML),
	answered("/en/", 200, "en", HTML),
	answered("/th", 200, "th", HTML, true),
	answered("/th/no-such-page", 404, "th", HTML),
	answered("/no-such-page", 404, "en", HTML),
	answered("/__mf-preload.js", 404, null, HTML),
	answered(`/${SITEMAP_FILE}`, 200, null, XML),
	answered(`/${ROBOTS_FILE}`, 200, null, PLAIN_TEXT),
])
