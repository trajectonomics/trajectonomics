import {
	type CopiedSignal,
	copiedPrompt,
	PROMPT_COPIED_EVENT,
	promptCopiedProperties,
} from "./copy"
import {
	capturePayload,
	type EventIdentity,
	eventIdentity,
	PAGEVIEW_EVENT,
	POSTHOG_CAPTURE_URL,
	pageviewProperties,
	shouldSend,
} from "./posthog"

/**
 * The event the Copy button dispatches when the prompt reaches the clipboard. It carries a
 * `detail.command`, and the script that did the copying does not itself post anything, so the
 * button keeps working with JavaScript off and the measurement is one listener here. Both names are
 * wire values the series was measured with, so neither moves with the page's words.
 */
export const PROMPT_COPIED_SIGNAL = "traj:site-command-copied"

/** The two browser fields the opt-out check reads beyond the standard `Navigator`. */
interface PrivacyNavigator extends Navigator {
	readonly globalPrivacyControl?: boolean
}

/** The body one event posts, as a JSON string the endpoint parses. */
function body(payload: unknown): string {
	return JSON.stringify(payload)
}

/** The content type of every body: `text/plain` is a simple request, so it needs no preflight. */
const TEXT_TYPE = "text/plain;charset=UTF-8"

/**
 * Post one body without blocking the page: the endpoint's own client sends the same content type. A
 * cross-origin `fetch` sends no credentials by default, so none is named.
 */
function post(text: string): void {
	const beacon = new Blob([text], { type: TEXT_TYPE })
	if (
		typeof navigator.sendBeacon === "function" &&
		navigator.sendBeacon(POSTHOG_CAPTURE_URL, beacon)
	) {
		return
	}
	void fetch(POSTHOG_CAPTURE_URL, {
		method: "POST",
		body: text,
		headers: { "Content-Type": TEXT_TYPE },
		keepalive: true,
	}).catch(() => {
		// Measurement never changes what the page does: a dropped event is dropped, not an error.
	})
}

/**
 * A random version 4 UUID: the id of a visitor who did not consent. `randomUUID` is available in every
 * secure context the Site is served in, so there is no fallback to ship within the program budget.
 */
function createId(): string {
	return crypto.randomUUID()
}

/**
 * Measure this visit: one pageview for the page the visitor opened, and one event for each prompt
 * the Copy button puts on their clipboard.
 *
 * The page's `data-visitor` is the id of a visitor who granted consent, which the Worker wrote into
 * the page ([ADR 0024](../../../docs/adr/0024-the-site-asks-before-it-sets-an-analytics-cookie.md));
 * every event then shares it. Without one each event gets its own id, and each carries its `consent`.
 * Nothing is sent when the page is not on the production host or the visitor set an opt-out signal.
 */
export function startAnalytics(win: Window = window, doc: Document = document): void {
	const nav = win.navigator as PrivacyNavigator
	if (
		!shouldSend({
			hostname: win.location.hostname,
			doNotTrack: nav.doNotTrack,
			globalPrivacyControl: nav.globalPrivacyControl ?? null,
		})
	)
		return

	const language = doc.documentElement.lang
	const visitor = doc.documentElement.dataset["visitor"]
	const pageview: EventIdentity = eventIdentity(visitor, createId)

	post(
		body(
			capturePayload(PAGEVIEW_EVENT, pageview.distinctId, {
				...pageviewProperties({
					href: win.location.href,
					referrer: doc.referrer,
					language,
					title: doc.title,
				}),
				consent: pageview.consent,
			}),
		),
	)

	doc.addEventListener(PROMPT_COPIED_SIGNAL, (event) => {
		const detail = (event as CustomEvent<CopiedSignal>).detail
		const copied = copiedPrompt(detail, language)
		const identity = eventIdentity(visitor, createId)
		post(
			body(
				capturePayload(PROMPT_COPIED_EVENT, identity.distinctId, {
					...promptCopiedProperties(copied),
					consent: identity.consent,
				}),
			),
		)
	})
}
