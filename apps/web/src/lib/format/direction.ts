/**
 * A money amount read the way a person reads it: a word for its direction, and the CLI's digits
 * without the ledger's sign. Dropping a leading minus and adding a word is formatting, never
 * arithmetic: every digit stays the CLI's own ([ADR 0030](../../docs/adr/0030-a-direction-word-and-a-dropped-leading-minus-are-formatting-not-arithmetic.md)).
 */

/** What an amount means for a person: money coming in, money going out, or money still owed. */
export type AmountDirection = "income" | "expense" | "liability"

/** One CLI amount as it is shown: the direction in words, and the CLI's digits without the sign. */
export interface DirectedAmount {
	readonly word: "Money in" | "Money out" | "You owe"
	/** The CLI's decimal string with at most its leading minus removed: no digit changes. */
	readonly digits: string
}

const WORD: Readonly<Record<AmountDirection, DirectedAmount["word"]>> = {
	income: "Money in",
	expense: "Money out",
	liability: "You owe",
}

/**
 * Reads one CLI amount with its direction. The ledger books income negative, expenses positive and
 * liabilities negative; a person reads "Money in", "Money out" or "You owe" instead.
 */
export function directedAmount(amount: string, direction: AmountDirection): DirectedAmount {
	return { word: WORD[direction], digits: amount.startsWith("-") ? amount.slice(1) : amount }
}

/**
 * The direction of a profit and loss total, which is income minus expenses: a positive total is money
 * in and a negative one money out. The sign is the CLI's; the page chooses a word from it only.
 */
export function totalDirection(amount: string): AmountDirection {
	return amount.startsWith("-") ? "expense" : "income"
}
