/**
 * The notes the CLI states that ask the reader to check something. The words are the CLI's own (see `funding.ts`,
 * `withdraw-notes.ts` and `levies.ts`); the page only recognises them.
 */
const WARNING_PATTERNS: readonly RegExp[] = [
	/could not be funded/,
	/could not fund/,
	/\bunmet on\b/,
	/^No tax is applied\b/,
	/^Tax before .* is not recomputed\b/,
]

/** Whether a note is one that asks the reader to check something. */
export function isWarningNote(note: string): boolean {
	return WARNING_PATTERNS.some((pattern) => pattern.test(note))
}
