/** The words a plan's cards give a field, in place of the key a Set's path names. Pure. */
import { formatBps } from "../format"
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

/** Whether an item's id is a salary's employer share, which the Dashboard writes as `<salary>-employer` (web ADR 0017). */
function isEmployerShare(id: string): boolean {
	return id.endsWith("-employer")
}

/** A field's words as its card states them; an employer share's `target` is the Account its form names. */
function fieldWords(field: string, id: string): string {
	if (field === "target" && isEmployerShare(id)) return "account"
	return FIELD_WORDS[field] ?? field
}

/** A share a `derive` states: a scale of basis points over the 10,000 the salary form writes. */
interface ShareMeasure {
	readonly op: string
	readonly den: number
	readonly num: number
}

/** Whether a derive's measure is a share: a scale of whole basis points over 10,000. */
function isShareMeasure(value: unknown): value is ShareMeasure {
	if (typeof value !== "object" || value === null) return false
	const measure = value as Record<string, unknown>
	return (
		measure["op"] === "scale" &&
		measure["den"] === 10000 &&
		typeof measure["num"] === "number" &&
		Number.isInteger(measure["num"]) &&
		measure["num"] >= 0
	)
}

/** The basis points an employer's share states, or null for a `derive` that is not one. */
function shareBps(value: Json): number | null {
	if (typeof value !== "object" || value === null) return null
	const derive = value as { measures?: unknown; result?: unknown }
	if (derive.result !== "share" || !Array.isArray(derive.measures)) return null
	const measure = derive.measures.find(isShareMeasure)
	return measure === undefined ? null : measure.num
}

/** A flag's words: `earned` as the income card says it, and `realise` as on or off. */
function flagWords(field: string, value: Json): string | null {
	if (field === "earned") return value === true ? "Earned" : "Passive"
	if (field === "realise") return value === true ? "on" : "off"
	return null
}

/** A Set's value as the field's card shows it: a share or a swing in its percent, a flag in words, else the person's text. */
function fieldValueWords(field: string, value: Json): string {
	const flag = flagWords(field, value)
	if (flag !== null) return flag
	if (field === "derive") {
		const share = shareBps(value)
		// The employer's share as its card states it: the CLI's integer through the card's own `formatBps`.
		if (share !== null) return `${formatBps(share)}%`
	}
	if (field === "volatility" && typeof value === "number" && Number.isInteger(value)) {
		return `${formatBps(value)}%`
	}
	return typeof value === "string" ? value : JSON.stringify(value)
}

/** A Set's words: its item with a capital, the field's words, and its value as the field's card shows it. */
export function fieldChange(
	path: string,
	field: string,
	value: Json,
): { label: string; value: string } {
	const id = path.split(".")[1] ?? path
	const words = fieldValueWords(field, value)
	const separator = field === "realise" ? ": " : " set to "
	const item = id.charAt(0).toUpperCase() + id.slice(1)
	return { label: `${item} ${fieldWords(field, id)}${separator}${words}`, value: words }
}
