import type { AppError } from "../../errors"
import type { AccountRow } from "../../store"
import type { ValueEntry } from "./document"

/** One entry as the caller wrote it, with its position in the list it came from. */
export type Positioned = ValueEntry & { index: number }

/** What a plan is asked for, and how it names the input a refusal points at. */
export type ValueRequest = {
	against: string
	entries: readonly Positioned[]
	/** The refusal path of one entry's field: the flag in the single form, the document path in a batch. */
	path: (index: number, field: keyof ValueEntry) => string
	againstPath: string
	/** A batch lists every refused entry in one envelope; the single form returns its one refusal. */
	batch: boolean
}

/** One entry's outcome, in minor units on the account's stated side (a liability's is what it owes). */
export type ValuedRow = {
	index: number
	account: AccountRow
	date: string
	before: number
	value: number
	difference: number
	/** The position of the row this entry appends in `writes`, or null when it was already true. */
	write: number | null
	notes: string[]
}

export type Valuation = { against: AccountRow; rows: ValuedRow[] }

/** An entry the plan refused, at its position in the list it came from. */
export type Refusal = { index: number; error: AppError }

/** An entry whose account, date and value were read and checked, ready to be applied. */
export type Prepared = { index: number; account: AccountRow; date: string; value: number }
