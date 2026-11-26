/** The card fields a what-if can change. */
export type WasField =
	| "amount"
	| "frequency"
	| "start"
	| "end"
	| "growth"
	| "earned"
	| "rate"
	| "compounding"
	| "lockedUntil"
	| "kind"
	| "payout"
	| "payoutHow"
	| "fee"
	| "lifetimeFees"
	| "lifetimePayouts"
	| "employer"

/** The baseline's text of each field the session changed. */
export type Was = { readonly [K in WasField]?: string }

/** What a planner card shows of the session beside what the plan stores. */
export interface ItemMarks {
	/** The item is switched off in the session: the card is dimmed and says so. */
	readonly off: boolean
	/** Per field the session changes: the baseline text the card strikes through beside the what-if value. */
	readonly was: Was
}

/** The marks of every card, by item id. Empty with no session on the plan. */
export type MarkMap = Readonly<Record<string, ItemMarks>>

/** The marks a card with no session has. */
export const NO_MARKS: ItemMarks = { off: false, was: {} }

/** A card field's plain text: the words a field carries, or the value as it stands. */
function textOf(value: unknown): string {
	if (typeof value === "object" && value !== null && "text" in value) {
		const text = (value as { text: unknown }).text
		if (typeof text === "string") return text
	}
	return String(value ?? "")
}

/**
 * The marks of one item: whether it is off, and the baseline's text of each field whose text differs from the
 * what-if's. The texts are compared as the cards show them; none is parsed or computed.
 */
export function marksOf<T extends object>(
	baseline: T,
	whatIf: T | undefined,
	off: boolean,
	fields: readonly (keyof T & WasField)[],
): ItemMarks {
	if (whatIf === undefined) return { off, was: {} }
	const was: { [K in WasField]?: string } = {}
	for (const field of fields) {
		const before = textOf(baseline[field])
		if (before !== textOf(whatIf[field])) was[field] = before
	}
	return { off, was }
}

/** The cards to show: each item as the what-if holds it, or as the plan stores it when the what-if removed it. */
export function shownCards<T extends { id: string }>(
	baseline: readonly T[],
	whatIf: readonly T[],
): T[] {
	return baseline.map((card) => whatIf.find((entry) => entry.id === card.id) ?? card)
}
