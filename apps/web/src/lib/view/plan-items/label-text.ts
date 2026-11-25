/**
 * A display label in a form: the name a person reads in place of an id (sim ADR 0032, cli ADR 0080). The form trims what
 * the person typed before it sends it, so a stray space never reaches `traj`, which refuses untrimmed text. The checks
 * here are shape checks only; the CLI owns the rule.
 */

/** The most code points `traj` takes in a display label. */
export const LABEL_MAX = 80

/** The label a draft names, trimmed; null for an empty field, which leaves the item unnamed. */
export function labelOf(text: string): string | null {
	const trimmed = text.trim()
	return trimmed === "" ? null : trimmed
}

/** Why a label cannot be saved, or null when it can: over 80 code points, or a control character. */
export function labelProblem(text: string): string | null {
	const label = labelOf(text)
	if (label === null) return null
	const codePoints = Array.from(label, (character) => character.codePointAt(0) ?? 0)
	if (codePoints.length > LABEL_MAX) {
		return `Enter a name of at most ${LABEL_MAX} characters, or leave it empty.`
	}
	if (codePoints.some((code) => code < 0x20 || (code >= 0x7f && code <= 0x9f))) {
		return "Enter a name with no control characters."
	}
	return null
}
