/** The words a plan's cards give a field, in place of the key a Set's path names. Pure. */
import type { Json } from "./overrides"

/** A field whose key is not the word its card states. A key that is already its word is left as it is. */
const FIELD_WORDS: Readonly<Record<string, string>> = {
	derive: "share",
	displayLabel: "name",
	earned: "income",
	endAt: "end",
	frequency: "how often",
	lockedUntil: "locked until",
	realise: "count any gain for tax",
	source: "move from",
	startAt: "start",
	target: "move to",
	volatility: "swing",
}

/** A field's words as its card states them: "locked until" for `lockedUntil`, and the key itself when it is a word. */
export function fieldWords(field: string): string {
	return FIELD_WORDS[field] ?? field
}

/** A Set's value as the bar shows it: the `earned` field as `Earned` or `Passive`, and anything else as the person typed it. */
export function fieldValueWords(field: string, value: Json): string {
	if (field === "earned") return value === true ? "Earned" : "Passive"
	return typeof value === "string" ? value : JSON.stringify(value)
}
