import { MINUS } from "../../format"

/** What a cell shows: a CLI money string, or a word the page writes itself. */
export type Value =
	| { readonly kind: "money"; readonly amount: string }
	| { readonly kind: "text"; readonly text: string }

/** One cell of a figure table: its value and, when it helps, a line under it. */
export interface Cell {
	readonly value: Value
	readonly note: string | null
}

/** The mark for a delta the CLI did not state. */
export const NO_DELTA = "—"

/** The words for a delta of zero. */
export const NO_CHANGE = "No change"

const ZERO = /^-?0+(\.0+)?$/

/** A money cell, with the CLI's string as it is. */
export function moneyCell(amount: string, note: string | null = null): Cell {
	return { value: { kind: "money", amount }, note }
}

/** A word cell. */
export function textCell(text: string, note: string | null = null): Cell {
	return { value: { kind: "text", text }, note }
}

/** Whether a CLI money string is zero, with or without its sign. */
export function isZeroAmount(amount: string): boolean {
	return ZERO.test(amount)
}

/** A money difference as the CLI states it: null shows the dash and why, zero says so. */
export function moneyDifference(amount: string | null, reason: string): Cell {
	if (amount === null) return textCell(NO_DELTA, reason)
	if (isZeroAmount(amount)) return textCell(NO_CHANGE)
	return moneyCell(amount)
}

/** A whole-number difference, in months or years, with the sign the CLI gave it. */
export function countDifference(
	count: number | null,
	unit: "month" | "year",
	reason: string,
): Cell {
	if (count === null) return textCell(NO_DELTA, reason)
	if (count === 0) return textCell(NO_CHANGE)
	return textCell(signedCount(count, unit))
}

function signedCount(count: number, unit: "month" | "year"): string {
	const digits = String(count).replace("-", "")
	const word = digits === "1" ? unit : `${unit}s`
	return `${count < 0 ? MINUS : "+"}${digits} ${word}`
}
