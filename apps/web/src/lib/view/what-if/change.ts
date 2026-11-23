import { MINUS } from "../../format"
import { isZeroAmount } from "../compare/cell"

/**
 * The change a figure shows beside its what-if value and its baseline. It is always a figure `traj` stated
 * (`projection compare`'s `delta`, `months` or `fiMonths`): a change the CLI did not state is `none`, with the
 * reason, and is never worked out here. A change carries a sign and words, so colour is never the only cue.
 */
export type ChangeView =
	| { readonly kind: "none"; readonly reason: string }
	| { readonly kind: "same" }
	| { readonly kind: "money"; readonly amount: string; readonly words: string }
	| { readonly kind: "count"; readonly text: string; readonly words: string }

/** The words of a change in money: `[for an increase, for a decrease]`, such as `["higher", "lower"]`. */
export type MoneyWords = readonly [string, string]

/** The CLI's money change, with the sign it gave it. A zero says "same"; null says why there is none. */
export function moneyChange(
	delta: string | null | undefined,
	words: MoneyWords,
	reason: string,
): ChangeView {
	if (delta === null || delta === undefined) return { kind: "none", reason }
	if (isZeroAmount(delta)) return { kind: "same" }
	return { kind: "money", amount: delta, words: delta.startsWith("-") ? words[1] : words[0] }
}

/**
 * The CLI's whole-number change in months or years. `words` are `[for a negative count, for a positive one]`,
 * such as `["earlier", "later"]`: the sign is the CLI's (b minus a), and the page only reads it.
 */
export function countChange(
	count: number | null | undefined,
	unit: "month" | "year",
	words: MoneyWords,
	reason: string,
): ChangeView {
	if (count === null || count === undefined) return { kind: "none", reason }
	if (count === 0) return { kind: "same" }
	const digits = String(count).replace("-", "")
	const noun = digits === "1" ? unit : `${unit}s`
	const sign = count < 0 ? MINUS : "+"
	return { kind: "count", text: `${sign}${digits} ${noun}`, words: count < 0 ? words[0] : words[1] }
}

/** The sentence a screen reader hears for a change, as the visible text reads. */
export function changeSentence(change: ChangeView): string {
	if (change.kind === "none") return `No change figure. ${change.reason}`
	if (change.kind === "same") return "No change"
	if (change.kind === "count") return `${change.text}, ${change.words}`
	return `${change.amount.startsWith("-") ? "" : "+"}${change.amount}, ${change.words}`
}
