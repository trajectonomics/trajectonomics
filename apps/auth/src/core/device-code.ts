/**
 * The device flow's user code, normalized exactly as Better Auth 1.7.28 does. The library's
 * `findDeviceCodeByUserCode` first looks up the value as typed, then (when it normalizes to the
 * default alphabet) the stripped, upper-cased form: `abcd-efgh` finds `ABCDEFGH`. The consent
 * after-hook must use the same candidates, or approving a dashed or lower-case code updates the
 * device row while no `oauthConsent` row is created.
 *
 * This module is pure: no I/O, no clock, no environment.
 */

/** The default generated alphabet: no I/O/0/1, so every character is unambiguous. */
const DEFAULT_USER_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/i

/** Strips every non-alphanumeric character and upper-cases, as the library does. */
export function normalizeUserCode(value: string): string {
	return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}

/**
 * The values to try, in order: the exact code, then its normalized form when that form is a
 * default-alphabet code. A custom code keeps only its exact lookup.
 */
export function userCodeCandidates(value: string): string[] {
	const normalized = normalizeUserCode(value)
	if (normalized === value || !DEFAULT_USER_CODE_PATTERN.test(normalized)) return [value]
	return [value, normalized]
}
