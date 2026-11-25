/**
 * A money amount read the way a person reads it: a word for its direction, and the CLI's digits
 * without the ledger's sign. Dropping a leading minus and adding a word is formatting, never
 * arithmetic: every digit stays the CLI's own ([ADR 0030](../../docs/adr/0030-a-direction-word-and-a-dropped-leading-minus-are-formatting-not-arithmetic.md)).
 */

/** What a CLI amount is about, which decides the pair of words its sign chooses between. */
export type AmountKind =
	/** Money earned or spent over a period. The ledger books a debit positive, so a leading minus is money in. */
	| "money"
	/** A balance still owed: a leading minus is money you owe, and no sign is money owed to you. */
	| "owed"
	/** A net total, which the CLI states as income less expenses: a positive total is money in. */
	| "net"

/** One CLI amount as it is shown: the direction in words, and the CLI's digits without the sign. */
export interface DirectedAmount {
	/** The word for the amount's direction; null for zero, which has no direction. */
	readonly word: "Money in" | "Money out" | "You owe" | "Owed to you" | null
	/** The CLI's decimal string with at most its leading minus removed: no digit changes. */
	readonly digits: string
}

type Word = NonNullable<DirectedAmount["word"]>

/** The word a sign takes for each kind: the sign decides, and the kind decides which pair of words. */
const WORD: Readonly<Record<AmountKind, { readonly negative: Word; readonly positive: Word }>> = {
	money: { negative: "Money in", positive: "Money out" },
	owed: { negative: "You owe", positive: "Owed to you" },
	net: { negative: "Money out", positive: "Money in" },
}

/** A zero stated either way the CLI writes it: "0.00" or "-0.00". */
const ZERO = /^0+(?:\.0+)?$/

/**
 * Reads one CLI amount as a person reads it. The sign picks the word and the kind picks the pair,
 * so an expense refund and an income reversal read the way their sign says rather than the way
 * their account type does. Zero has no direction at all.
 */
export function directedAmount(amount: string, kind: AmountKind): DirectedAmount {
	const digits = amount.startsWith("-") ? amount.slice(1) : amount
	if (ZERO.test(digits)) return { word: null, digits }
	return { word: WORD[kind][amount.startsWith("-") ? "negative" : "positive"], digits }
}
