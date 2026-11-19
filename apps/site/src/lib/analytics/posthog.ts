/**
 * The event payloads the Site posts to PostHog, and the conditions under which it posts none.
 *
 * The Site loads no third-party script ([ADR 0005](../../../docs/adr/0005-page-weight-and-web-font-budget.md))
 * and stores nothing for the visitor ([ADR 0003](../../../docs/adr/0003-thai-and-english-from-visitor-signals.md)),
 * so it posts to PostHog's capture endpoint itself ([ADR 0011](../../../docs/adr/0011-analytics-from-the-page-itself.md))
 * and every event it posts is anonymous, with an id made for that event alone.
 * A project key can only write events, so it is public by design and is committed here.
 */

/** The PostHog project's ingestion key: write-only, and the same key the Docs Portal uses. */
export const POSTHOG_KEY = "phc_o5LAcajRLpXxdxbUKg4f4veqqdM9xwQ954aQ92vCNvsF"

/** The capture endpoint of the project's EU host, the region the project lives in. */
export const POSTHOG_CAPTURE_URL = "https://eu.i.posthog.com/i/v0/e/"

/** The only host whose pages are measured: a preview or `workers.dev` page would pollute the project. */
export const MEASURED_HOSTNAME = "trajectonomics.com"

/** The name this Surface writes into every event, so one project can tell the surfaces apart. */
export const SURFACE = "site"

/** The event a visitor's page load sends, and the one the name PostHog's Web Analytics reads. */
export const PAGEVIEW_EVENT = "$pageview"

/** The browser conditions that decide whether the page measures a visitor at all. */
export interface VisitorConditions {
	readonly hostname: string
	/** `navigator.doNotTrack`: `"1"` when the visitor asked every site not to track them. */
	readonly doNotTrack: string | null
	/** `navigator.globalPrivacyControl`: `true` when the visitor asked every site not to sell or share. */
	readonly globalPrivacyControl: boolean | null
}

/** One page the pageview describes, as the document gives it. */
export interface PageviewSource {
	readonly href: string
	readonly referrer: string
	/** The Language of the Locale URL the page is under. */
	readonly language: string
	readonly title: string
}

/** The body one event posts: the endpoint reads `api_key` and `event` beside the properties. */
export interface CapturePayload {
	readonly api_key: string
	readonly event: string
	readonly properties: Readonly<Record<string, string | number | boolean>>
}

/**
 * Whether the page measures this visitor: the production host, and neither opt-out signal set.
 *
 * A visitor on the staging host or on `localhost` is not measured, so a preview never reaches the
 * project, and the check needs no build flag, which the served page could not read anyway.
 */
export function shouldSend(conditions: VisitorConditions): boolean {
	if (conditions.hostname !== MEASURED_HOSTNAME) return false
	if (conditions.doNotTrack === "1") return false
	return conditions.globalPrivacyControl !== true
}

/** The properties of one pageview: where the visitor is, how they arrived, and which Language it is. */
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
 * The body one event posts. `$process_person_profile` is `false`: the Site keeps no person, so a
 * visitor is an event count and never a profile with a history.
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
