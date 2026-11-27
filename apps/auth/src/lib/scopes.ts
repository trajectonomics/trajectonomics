import type { Dictionary } from "./dictionary"

/** The dictionary key one OAuth scope maps to, where a plain-words line exists. */
export type ScopeKey =
	| "scopeOpenId"
	| "scopeProfile"
	| "scopeEmail"
	| "scopeOffline"
	| "scopeDataIngest"

/** One scope the app asked for, and the line the page can say instead of it. */
export type ScopeLine = { readonly scope: string; readonly key: ScopeKey | null }

const SCOPE_KEYS: Readonly<Record<string, ScopeKey>> = Object.freeze({
	openid: "scopeOpenId",
	profile: "scopeProfile",
	email: "scopeEmail",
	offline_access: "scopeOffline",
	"data:ingest": "scopeDataIngest",
})

/**
 * The distinct scopes in a space-separated string, each with the line that describes it.
 *
 * `openid` already says the name and email are seen, so when a client asks for `openid`, `profile`
 * and `email` together the three overlapping lines become the one sentence the person needs.
 */
export function scopeLines(scope: string | null | undefined): readonly ScopeLine[] {
	const values = (scope ?? "").split(/\s+/).filter((value) => value !== "")
	const distinct = [...new Set(values)]
	const merged =
		distinct.includes("openid") && distinct.includes("profile") && distinct.includes("email")
			? distinct.filter((value) => value !== "profile" && value !== "email")
			: distinct
	return Object.freeze(merged.map((value) => ({ scope: value, key: SCOPE_KEYS[value] ?? null })))
}

/** The words for one scope: the mapped line, or the scope itself when no line exists. */
export function scopeText(line: ScopeLine, dictionary: Dictionary): string {
	return line.key === null ? line.scope : dictionary[line.key]
}
