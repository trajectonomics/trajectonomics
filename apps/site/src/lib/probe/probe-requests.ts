import { CONSENT_PARAM, type ConsentChoice } from "../analytics/consent"
import type { Language } from "../language/language"
import { LANGUAGE_CHOICE_PARAM } from "../language/languages"
import type { Probe } from "./probe"

/** The media types of an answer that carries no body, so no media type is judged on one. */
const NO_BODY: readonly string[] = Object.freeze([])

/** The media type every page answers with. */
export const PAGE_MEDIA: readonly string[] = Object.freeze(["text/html"])

/** The media types the Sitemap may answer with: the sitemaps protocol names both of them. */
export const SITEMAP_MEDIA: readonly string[] = Object.freeze(["application/xml", "text/xml"])

/** The media type the Robots file answers with. */
export const ROBOTS_MEDIA: readonly string[] = Object.freeze(["text/plain"])

/** The directives `/` must name, because its answer depends on the choice and on the signals. */
const HOME_VARY: readonly string[] = Object.freeze(["cookie", "accept-language", "cf-ipcountry"])

/** `/` is private and revalidated, so no shared cache hands one Language to another visitor. */
const HOME_CACHE: readonly string[] = Object.freeze(["private", "no-cache"])

/** The choice answer is state, so nothing may store it. */
const CHOICE_CACHE: readonly string[] = Object.freeze(["no-store"])

/** An empty list of judged directives. */
const NONE: readonly string[] = Object.freeze([])

/** The facts an answer carries before a probe fills in what it judges: nothing it must prove. */
const DEFAULT_ANSWER: Omit<Probe, "path" | "status"> = Object.freeze({
	acceptLanguage: null,
	country: null,
	cookie: null,
	location: null,
	language: null,
	mediaTypes: NO_BODY,
	vary: NONE,
	cacheControl: NONE,
	etag: null,
	storesChoice: null,
	secGpc: null,
	setsConsent: null,
	contains: NONE,
	lacks: NONE,
})

/** One probe, from the answer it asks for. */
function probe(facts: Pick<Probe, "path" | "status"> & Partial<Probe>): Probe {
	return Object.freeze({ ...DEFAULT_ANSWER, ...facts })
}

/** The signals one request carries, filled in from its `null`s. */
type Signals = Partial<Pick<Probe, "acceptLanguage" | "country" | "cookie" | "secGpc">>

/** A request for `/`, answered with that Language's home for the signals given. */
export function home(language: Language, signals: Signals = {}): Probe {
	return probe({
		path: "/",
		status: 200,
		language,
		mediaTypes: PAGE_MEDIA,
		vary: HOME_VARY,
		cacheControl: HOME_CACHE,
		etag: true,
		...signals,
	})
}

/** The Language choice link, which stores the Language it names and returns to the address. */
export function choice(language: Language | null): Probe {
	return probe({
		path: `/?${LANGUAGE_CHOICE_PARAM}=${language ?? "zz"}`,
		status: 302,
		location: "/",
		cacheControl: CHOICE_CACHE,
		storesChoice: language,
	})
}

/**
 * A home that a consent answer personalised: it carries no validator, because the bytes now depend on the
 * answer, and its body states the answer. `contains` and `lacks` are the text the body must and must not
 * carry; `setsConsent` is set only when the request also has the answer's cookies written.
 */
export function personalised(
	language: Language,
	signals: Signals,
	body: Partial<Pick<Probe, "contains" | "lacks" | "setsConsent">>,
): Probe {
	return { ...home(language, signals), etag: null, ...body }
}

/** The consent link, which stores the answer it names and returns to the address with no banner. */
export function consent(choice: ConsentChoice | "reset"): Probe {
	return probe({
		path: `/?${CONSENT_PARAM}=${choice}`,
		status: 302,
		location: "/",
		cacheControl: CHOICE_CACHE,
		setsConsent: choice,
	})
}

/** An old prefix, which answers 301 to the address and stores nothing. */
export function moved(path: string): Probe {
	return probe({ path, status: 301, location: "/" })
}

/** A request for a built path, which must answer with `status`, in `language`, as `mediaTypes`. */
export function answered(
	path: string,
	status: number,
	language: Language | null,
	mediaTypes: readonly string[],
): Probe {
	return probe({ path, status, language, mediaTypes })
}
