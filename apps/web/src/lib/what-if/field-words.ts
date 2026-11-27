/** The words a plan's cards give a field, in place of the key a Set's path names. Pure. */
import { formatBps } from "../format"
import { employerShareBps } from "../view/plan-items/employer"
import { moveWords } from "../view/routing/transfer-read"
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

/**
 * The fields the Scenario document holds as integer basis points: an Account's `rate` and `volatility`, the economy's
 * `inflation`, and a Growth's `bps` (`contract/scenario-account.ts`, `scenario-show.ts`, `scenario-flow.ts`).
 */
const BPS_FIELDS: ReadonlySet<string> = new Set(["bps", "inflation", "rate", "volatility"])

/** A field's words as its card states them; an employer share's `target` is the Account its form names. */
function fieldWords(field: string, employerShare: boolean): string {
	if (field === "target" && employerShare) return "account"
	return FIELD_WORDS[field] ?? field
}

/** A flag's words: `earned` as the income card says it, and `realise` as on or off. */
function flagWords(field: string, value: Json): string | null {
	if (field === "earned") return value === true ? "Earned" : "Passive"
	if (field === "realise") return value === true ? "on" : "off"
	return null
}

/** A `derive`'s words: an employer's share in its percent, a transfer's moves as its card reads them, else null. */
function deriveWords(value: Json): string | null {
	const share = employerShareBps(value)
	if (share !== null) return `${formatBps(share)}%`
	return moveWords(value)
}

/** A Set's value as the field's card shows it: a share or a bps field in its percent, a flag in words, else the text. */
function fieldValueWords(field: string, value: Json): string {
	const flag = flagWords(field, value)
	if (flag !== null) return flag
	const words = field === "derive" ? deriveWords(value) : null
	if (words !== null) return words
	if (BPS_FIELDS.has(field) && typeof value === "number" && Number.isInteger(value)) {
		return `${formatBps(value)}%`
	}
	return typeof value === "string" ? value : JSON.stringify(value)
}

/** A Set's words: its item with a capital, the field's words, and its value as the field's card shows it. */
export function fieldChange(
	path: string,
	value: Json,
	employerShares: ReadonlySet<string>,
): { label: string; value: string } {
	const parts = path.split(".")
	const id = parts[1] ?? path
	const field = path.slice(path.lastIndexOf(".") + 1)
	const words = fieldValueWords(field, value)
	const separator = field === "realise" ? ": " : " set to "
	const item = id.charAt(0).toUpperCase() + id.slice(1)
	const name = parts.length > 2 ? ` ${fieldWords(field, employerShares.has(id))}` : ""
	return { label: `${item}${name}${separator}${words}`, value: words }
}
