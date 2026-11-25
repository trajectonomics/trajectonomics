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
		const before = String(baseline[field] ?? "")
		if (before !== String(whatIf[field] ?? "")) was[field] = before
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
