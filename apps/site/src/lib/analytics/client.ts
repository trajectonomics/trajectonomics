import {
	COMMAND_COPIED_EVENT,
	type CopiedCommand,
	capturePayload,
	commandCopiedProperties,
	PAGEVIEW_EVENT,
	POSTHOG_CAPTURE_URL,
	pageviewProperties,
	shouldSend,
} from "./posthog"

/**
 * The event the Copy button dispatches when one command reaches the clipboard. It carries a
 * `detail.command`, and the script that did the copying does not itself post anything, so the
 * button keeps working with JavaScript off and the measurement is one listener here.
 */
export const COMMAND_COPIED_SIGNAL = "traj:site-command-copied"

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

/** An id for a tab that has none: a version 4 UUID where the browser offers one. */
function createId(): string {
	if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
	const bytes = crypto.getRandomValues(new Uint8Array(16))
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Measure this visit: one pageview for the page the visitor opened, and one event for each command
 * the Copy button puts on their clipboard.
 *
 * Nothing is sent when the page is not on the production host or the visitor set an opt-out signal
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

	// The Site stores nothing for the visitor, so every event carries an id made for it alone: a
	// pageview and a copy are two counts, never one profile.
	const language = doc.documentElement.lang
	const pageviewId = createId()

	post(
		body(
			capturePayload(
				PAGEVIEW_EVENT,
				pageviewId,
				pageviewProperties({
					href: win.location.href,
					referrer: doc.referrer,
					language,
					title: doc.title,
				}),
			),
		),
	)

	doc.addEventListener(COMMAND_COPIED_SIGNAL, (event) => {
		const detail = (event as CustomEvent<CopiedCommand>).detail
		const copied: CopiedCommand = { command: detail.command, language }
		post(body(capturePayload(COMMAND_COPIED_EVENT, createId(), commandCopiedProperties(copied))))
	})
}
