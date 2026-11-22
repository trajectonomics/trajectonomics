import {
	capturePayload,
	PAGE_LOAD_EVENT,
	PAGEVIEW_EVENT,
	POSTHOG_CAPTURE_URL,
	pageviewProperties,
	readerIdentity,
	shouldSend,
} from "./posthog"

/** The two browser fields the opt-out check reads beyond the standard `Navigator`. */
interface PrivacyNavigator extends Navigator {
	readonly globalPrivacyControl?: boolean
}

/** The body one event posts, as a JSON string the endpoint parses. */
function body(payload: unknown): string {
	return JSON.stringify(payload)
}

/**
 * Post one body without blocking the page and without a preflight: `text/plain` is a simple
 * request, which is why the endpoint's own client sends the same content type.
 */
function post(text: string): void {
	const beacon = new Blob([text], { type: "text/plain;charset=UTF-8" })
	if (
		typeof navigator.sendBeacon === "function" &&
		navigator.sendBeacon(POSTHOG_CAPTURE_URL, beacon)
	) {
		return
	}
	void fetch(POSTHOG_CAPTURE_URL, {
		method: "POST",
		body: text,
		headers: { "Content-Type": "text/plain;charset=UTF-8" },
		keepalive: true,
		credentials: "omit",
	}).catch(() => {
		// Measurement never changes what the page does: a dropped event is dropped, not an error.
	})
}

/** A random id, a version 4 UUID where the browser offers one: the id of a reader who did not consent. */
function createId(): string {
	if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
	const bytes = crypto.getRandomValues(new Uint8Array(16))
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Measure this visit: one pageview for the page the reader opened, and one for every page the Client
 * Router swaps in afterwards, because a client-side navigation loads no document of its own.
 *
 * The id is read from the Site's consent cookies on each pageview. Nothing is stored here, so a reader
 * who never granted consent is counted once per pageview with a fresh id.
 *
 * Nothing is sent when the page is not on the production host or the reader set an opt-out signal
 * ([`shouldSend`](./posthog.ts)).
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

	// The address the last pageview described: `astro:page-load` fires on the first page too, so this
	// guard is what keeps one page from being counted twice.
	let measured: string | null = null

	const measure = (): void => {
		if (win.location.href === measured) return
		measured = win.location.href
		const identity = readerIdentity(doc.cookie, createId)
		post(
			body(
				capturePayload(PAGEVIEW_EVENT, identity.distinctId, {
					...pageviewProperties({
						href: win.location.href,
						referrer: doc.referrer,
						language: doc.documentElement.lang,
						title: doc.title,
					}),
					consent: identity.consent,
				}),
			),
		)
	}

	measure()
	doc.addEventListener(PAGE_LOAD_EVENT, measure)
}
