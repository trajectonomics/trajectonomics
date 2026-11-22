/**
 * The rules a request to the loopback server must hold before the Dashboard edits anything
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)). Pure:
 * the server reads the headers and passes them in, and each refusal answers its own status and code.
 */
import { isLoopbackHost } from "../serve/route"

/** The path that answers the page's token. Same-origin only: no CORS header is ever sent. */
export const EDIT_SESSION_PATH = "/edit-session"

/** The path an Edit is posted to. */
export const EDIT_PATH = "/edit"

/** The header that carries the session token on every Edit. */
export const EDIT_TOKEN_HEADER = "x-traj-edit-token"

/** A request the server refuses: its HTTP status, a code for the body, and the sentence a person reads. */
export type Refusal = { status: number; code: string; message: string }

const HOST_MESSAGE = "This Dashboard answers only to 127.0.0.1, localhost and [::1]."

/** The request's parts the session answer depends on. */
export type SessionFacts = { method: string; host: string | null; port: number }

/** The request's parts and the server's state that an Edit depends on. */
export type EditFacts = SessionFacts & {
	origin: string | null
	token: string | null
	contentType: string | null
	/** The token the server made at start. */
	expectedToken: string
	/** False until the first Snapshot is in, so an Edit never runs before there is a Plan to re-run. */
	ready: boolean
	/** True while another Edit runs. */
	busy: boolean
}

/** The Origin an Edit must come from: this server's own address, and no other. */
export function ownOrigin(port: number): string {
	return `http://127.0.0.1:${port}`
}

/** The media type of a Content-Type header, without its parameters, lower-cased. */
export function mediaTypeOf(contentType: string | null): string {
	return (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
}

/** Refuses the session answer to a request that is not GET from this machine's Host. */
export function refuseSession(facts: SessionFacts): Refusal | null {
	if (facts.method !== "GET") return refusal(405, "method_not_allowed", "Use GET.")
	if (!isLoopbackHost(facts.host, facts.port)) return refusal(403, "bad_host", HOST_MESSAGE)
	return null
}

/**
 * Refuses an Edit that does not hold every rule, checked in this order: POST, this Host, this Origin,
 * the session token, `application/json`, a Snapshot to re-read, and no Edit already running.
 */
export function refuseEdit(facts: EditFacts): Refusal | null {
	if (facts.method !== "POST") return refusal(405, "method_not_allowed", "Use POST.")
	if (!isLoopbackHost(facts.host, facts.port)) return refusal(403, "bad_host", HOST_MESSAGE)
	if (facts.origin !== ownOrigin(facts.port)) {
		return refusal(403, "bad_origin", `An Edit must come from ${ownOrigin(facts.port)}.`)
	}
	if (facts.token !== facts.expectedToken) {
		return refusal(403, "bad_token", "The Edit has no valid session token. Reload the Dashboard.")
	}
	if (mediaTypeOf(facts.contentType) !== "application/json") {
		return refusal(415, "unsupported_media_type", "An Edit is sent as application/json.")
	}
	if (!facts.ready) return refusal(503, "not_ready", "The Snapshot is still being read.")
	if (facts.busy) return refusal(409, "edit_running", "Another Edit is running. Wait for it.")
	return null
}

function refusal(status: number, code: string, message: string): Refusal {
	return { status, code, message }
}
