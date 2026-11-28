import type { AssumedItem } from "../../contract"
import { withSearch } from "../links"
import type { AssumedGroup, AssumedSentence } from "./types"

/** The most sentences Home's card says: the Plan page lists the rest. */
const SENTENCES = 3

export interface AssumedCardView {
	/** How many items the plan assumes. */
	readonly count: number
	readonly sentences: readonly AssumedSentence[]
	/** The list on the Plan page, with the address's query before the fragment. */
	readonly href: string
}

/** Home's card, or null when the plan assumes nothing, so the card is not drawn. */
export function assumedCard(
	items: readonly AssumedItem[],
	groups: readonly AssumedGroup[],
	search: string,
): AssumedCardView | null {
	if (items.length === 0 || groups.length === 0) return null
	return {
		count: items.length,
		sentences: groups.slice(0, SENTENCES).map((group) => group.sentence),
		href: `${withSearch("/projection/", search)}#assumed`,
	}
}
