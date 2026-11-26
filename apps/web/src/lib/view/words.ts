/** A sentence as parts: words, a money amount the page draws, and an item's words, which an id shows in code (web ADR 0029). */
import type { ItemLabel } from "./item-names"

/** A piece of a sentence: words, a money amount the page formats and masks, or an item's label. */
export type Part = string | { readonly amount: string } | { readonly item: ItemLabel }

/** A sentence as parts, and the same words as plain text for a label that cannot hold markup. */
export interface Words {
	readonly text: string
	readonly parts: readonly Part[]
}

/** A sentence's text with each amount grouped, for a label a screen reader or a test reads. */
export function plainText(parts: readonly Part[], money: (amount: string) => string): string {
	return parts
		.map((part) => {
			if (typeof part === "string") return part
			return "amount" in part ? money(part.amount) : part.item.text
		})
		.join("")
}

/** The words of a sentence: its parts, and its plain text with each amount left as the decimal string it came as. */
export function wordsOf(parts: readonly Part[]): Words {
	return { text: plainText(parts, (amount) => amount), parts }
}
