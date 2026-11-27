import type { Dictionary } from "./dictionary"

/** The dictionary key one OAuth scope maps to, where a plain-words line exists. */
export type ScopeKey =
	| "scopeOpenId"
	| "scopeProfile"
	| "scopeEmail"
	| "scopeIdentity"
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

/** The scopes that say who the person is, which one line can describe together. */
const IDENTITY_SCOPES: ReadonlySet<string> = new Set(["openid", "profile", "email"])

/**
 * The distinct scopes in a space-separated string, each with the line that describes it.
 *
 * Each line names exactly what the provider releases: `openid` the account id, `profile` the name
 * and picture, `email` the address. When a client asks for `profile` and `email` together, those
 * two and `openid` become the one sentence the person needs, where the first of them stood.
 */
export function scopeLines(scope: string | null | undefined): readonly ScopeLine[] {
	const values = (scope ?? "").split(/\s+/).filter((value) => value !== "")
	const distinct = [...new Set(values)]
	const lines: ScopeLine[] = distinct.map((value) => ({
		scope: value,
		key: SCOPE_KEYS[value] ?? null,
	}))
	if (!(distinct.includes("profile") && distinct.includes("email"))) return Object.freeze(lines)
	const first = distinct.findIndex((value) => IDENTITY_SCOPES.has(value))
	const merged: ScopeLine = {
		scope: distinct.includes("openid") ? "openid" : "profile",
		key: "scopeIdentity",
	}
	return Object.freeze(
		lines.flatMap((line, index) => {
			if (index === first) return [merged]
			return IDENTITY_SCOPES.has(line.scope) ? [] : [line]
		}),
	)
}

/** The words for one scope: the mapped line, or the scope itself when no line exists. */
export function scopeText(line: ScopeLine, dictionary: Dictionary): string {
	return line.key === null ? line.scope : dictionary[line.key]
}
