/**
 * The pageview the Docs Portal posts to PostHog, and the conditions under which it posts none.
 *
 * The Portal loads no third-party script, so it posts to PostHog's capture endpoint itself
 * ([ADR 0008](../../../docs/adr/0008-analytics-from-the-page-itself.md)). A project key can only
 * write events, so it is public by design and is committed here.
 *
 * A reader's id is the one the Site's banner wrote, and only when the reader granted consent
 * ([site ADR 0024](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/docs/adr/0024-the-site-asks-before-it-sets-an-analytics-cookie.md)).
 * The Portal stores nothing of its own, so a reader who never answered is counted per pageview.
 */

import { SITE_ORIGIN } from "../site"

/** The PostHog project's ingestion key: write-only, and the same key the Site uses. */
export const POSTHOG_KEY = "phc_o5LAcajRLpXxdxbUKg4f4veqqdM9xwQ954aQ92vCNvsF"

/** The capture endpoint of the project's EU host, the region the project lives in. */
export const POSTHOG_CAPTURE_URL = "https://eu.i.posthog.com/i/v0/e/"

/** The only host whose pages are measured: a `workers.dev` or `localhost` page would pollute the project. */
export const MEASURED_HOSTNAME = new URL(SITE_ORIGIN).hostname

/** The name this Surface writes into every event, so one project can tell the surfaces apart. */
export const SURFACE = "docs"

/** The event one page load sends, and the name PostHog's Web Analytics reads. */
export const PAGEVIEW_EVENT = "$pageview"

/** The Site's consent cookie: `granted` once the reader agreed, `denied` once they refused. */
export const CONSENT_COOKIE = "traj_consent"

/** The Site's visitor cookie: a random id the reader granted, which the Portal reads and never writes. */
export const VISITOR_COOKIE = "traj_vid"

/** The Astro event the Client Router fires on the first page and after every client-side navigation. */
export const PAGE_LOAD_EVENT = "astro:page-load"

/** The strict lowercase UUID a visitor id must be before it is trusted as an event's `distinct_id`. */
const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The browser conditions that decide whether the page measures a reader at all. */
export interface VisitorConditions {
	readonly hostname: string
	/** `navigator.doNotTrack`: `"1"` when the reader asked every site not to track them. */
	readonly doNotTrack: string | null
	/** `navigator.globalPrivacyControl`: `true` when the reader asked every site not to sell or share. */
	readonly globalPrivacyControl: boolean | null
}

/** One page the pageview describes, as the document gives it. */
export interface PageviewSource {
	readonly href: string
	readonly referrer: string
	/** The `lang` of the document, which the Portal publishes as `en`. */
	readonly language: string
	readonly title: string
}

/** How one event's reader is identified: `granted` when the Site's visitor id is used, `cookieless` otherwise. */
export interface ReaderIdentity {
	readonly distinctId: string
	readonly consent: "granted" | "cookieless"
}

/** The body one event posts: the endpoint reads `api_key` and `event` beside the properties. */
export interface CapturePayload {
	readonly api_key: string
	readonly event: string
	readonly properties: Readonly<Record<string, string | number | boolean>>
}

/**
 * Whether the page measures this reader: the production host, and neither opt-out signal set.
 *
 * A reader on the `workers.dev` staging host or on `localhost` is not measured, so a preview never
 * reaches the project, and the check needs no build flag, which the served page could not read.
 */
export function shouldSend(conditions: VisitorConditions): boolean {
	if (conditions.hostname !== MEASURED_HOSTNAME) return false
	if (conditions.doNotTrack === "1") return false
	return conditions.globalPrivacyControl !== true
}

/** The properties of one pageview: where the reader is, how they arrived, and which page it is. */
export function pageviewProperties(
	source: PageviewSource,
): Readonly<Record<string, string | boolean>> {
	const url = new URL(source.href)
	return {
		$current_url: source.href,
		$host: url.host,
		$pathname: url.pathname,
		$referrer: source.referrer,
		$title: source.title,
		language: source.language,
		surface: SURFACE,
	}
}

/**
 * The body one event posts. `$process_person_profile` is `false`: the Portal keeps no person, so a
 * reader is a pageview count and never a profile with a history.
 */
export function capturePayload(
	event: string,
	distinctId: string,
	properties: Readonly<Record<string, string | boolean>>,
): CapturePayload {
	return {
		api_key: POSTHOG_KEY,
		event,
		properties: { ...properties, distinct_id: distinctId, $process_person_profile: false },
	}
}

/** The value of one named cookie in a `document.cookie` string, or `undefined` when it is not there. */
function cookieValue(cookies: string, name: string): string | undefined {
	for (const part of cookies.split(";")) {
		const separator = part.indexOf("=")
		if (separator < 0) continue
		if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim()
	}
	return undefined
}

/**
 * The identity one pageview is sent under. A reader who granted consent on the Site has a valid visitor
 * id, which the Portal uses so visits are told apart; anyone else gets a fresh id per pageview, and nothing
 * is stored. The id is validated here, so a hostile cookie value never reaches an event.
 */
export function readerIdentity(cookies: string, createId: () => string): ReaderIdentity {
	const visitor = cookieValue(cookies, VISITOR_COOKIE)
	const granted = cookieValue(cookies, CONSENT_COOKIE) === "granted"
	if (granted && visitor !== undefined && VISITOR_ID.test(visitor)) {
		return { distinctId: visitor, consent: "granted" }
	}
	return { distinctId: createId(), consent: "cookieless" }
}
