/**
 * The token endpoint's `grant_type` rule. Better Auth 1.7.28 validates the field with
 * `z.string().trim().min(1)`, so `"refresh_token "` reaches the provider as `refresh_token`. A
 * hook that compared the raw string would therefore miss the padded value and skip every
 * refresh check (gate 3). The hook asks this function instead: a value that differs from its
 * trim is rejected with `invalid_request` rather than silently normalized, so a client cannot
 * smuggle a grant type past the checks.
 *
 * This module is pure: no I/O, no clock, no environment.
 */

export type GrantTypeRejection = "grant-type-padded" | "grant-type-invalid"

export type GrantTypeDecision =
	| { grantType: string; rejection: null }
	| { grantType: null; rejection: GrantTypeRejection }

/** The library's trim, then the padding rejection the token hook answers before it decides. */
export function grantTypeDecision(value: unknown): GrantTypeDecision {
	if (typeof value !== "string") return { grantType: null, rejection: "grant-type-invalid" }
	const trimmed = value.trim()
	if (trimmed === "") return { grantType: null, rejection: "grant-type-invalid" }
	if (trimmed !== value) return { grantType: null, rejection: "grant-type-padded" }
	return { grantType: trimmed, rejection: null }
}
