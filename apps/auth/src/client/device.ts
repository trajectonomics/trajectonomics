/**
 * The device page's flow: sign in, read the typed code, and decide. The page component only paints
 * the state this module returns, so the whole flow fits in one readable place.
 */
import type { Language } from "../lib/language"
import { type ScopeLine, scopeLines } from "../lib/scopes"
import { normalizeUserCode } from "../lib/user-code"
import { AuthRequestError } from "./errors"
import { ensureConsent, ensureSignedIn } from "./guard"
import { clientNameOf, lookupDevice } from "./oauth"

/** What one lookup of a typed code settles. */
export type DeviceLookup =
	| { readonly kind: "enter"; readonly reason: "invalid" | "expired" }
	| { readonly kind: "failed" }
	| { readonly kind: "status"; readonly status: "approved" | "denied" }
	| {
			readonly kind: "review"
			readonly code: string
			readonly shown: string
			readonly lines: readonly ScopeLine[]
			readonly clientName: string
	  }

/** What the page shows when it opens. */
export type DeviceEntry =
	| { readonly kind: "stop" }
	| { readonly kind: "failed" }
	| { readonly kind: "enter" }
	| { readonly kind: "status"; readonly status: "approved" | "denied" }
	| {
			readonly kind: "review"
			readonly email: string
			readonly code: string
			readonly shown: string
			readonly lines: readonly ScopeLine[]
			readonly clientName: string
	  }

/** Looks one code up: the app's name and permissions, an end state, or why it cannot be read. */
export async function lookUpDevice(value: string): Promise<DeviceLookup> {
	const normalized = normalizeUserCode(value)
	if (normalized === "") return { kind: "enter", reason: "invalid" }
	try {
		return await readCode(normalized, value)
	} catch (error) {
		return failedLookup(error)
	}
}

/** One successful read of the code, as the page renders it. */
async function readCode(normalized: string, typed: string): Promise<DeviceLookup> {
	const result = await lookupDevice(normalized)
	if (result.status === "approved" || result.status === "denied") {
		return { kind: "status", status: result.status }
	}
	if (result.client_id === undefined) return { kind: "enter", reason: "invalid" }
	return {
		kind: "review",
		code: normalized,
		shown: typed.trim(),
		lines: scopeLines(result.scope),
		clientName: (await clientNameOf(result.client_id)) ?? "",
	}
}

/** A code the server rejected is the person's to correct; an unavailable server is not. */
function failedLookup(error: unknown): DeviceLookup {
	if (error instanceof AuthRequestError && (error.status === 429 || error.status >= 500)) {
		return { kind: "failed" }
	}
	return { kind: "enter", reason: expiredError(error) ? "expired" : "invalid" }
}

/** Signs in, answers the marketing question if it is still open, and reads `?user_code=`. */
export async function enterDevice(language: Language): Promise<DeviceEntry> {
	try {
		const session = await ensureSignedIn(language)
		if (session === null) return { kind: "stop" }
		if (!(await ensureConsent(language))) return { kind: "stop" }
		const fromQuery = new URLSearchParams(window.location.search).get("user_code")?.trim() ?? ""
		if (fromQuery === "") return { kind: "enter" }
		const outcome = await lookUpDevice(fromQuery)
		if (outcome.kind === "review") {
			return { ...outcome, email: session.user.email }
		}
		return outcome
	} catch {
		return { kind: "failed" }
	}
}

/** Whether a lookup failed because the code is past its lifetime. */
function expiredError(error: unknown): boolean {
	return error instanceof Error && /expired/i.test(error.message)
}
