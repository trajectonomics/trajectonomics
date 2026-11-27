/** The words a plan's cards give a field, in place of the key a Set's path names. Pure. */

/** A field whose key is not the word its card states. A key that is already its word is left as it is. */
const FIELD_WORDS: Readonly<Record<string, string>> = {
	displayLabel: "name",
	earned: "income",
	endAt: "end",
	frequency: "how often",
	lockedUntil: "locked until",
	rateBps: "rate",
	startAt: "start",
	volatility: "how much it swings",
}

/** A field's words as its card states them: "locked until" for `lockedUntil`, and the key itself when it is a word. */
export function fieldWords(field: string): string {
	return FIELD_WORDS[field] ?? field
}
