import { MINUS } from "./money"

/** What a hidden amount shows in place of its digits. */
export const AMOUNT_MASK = "•••••"

/** The one character a mask holds, which no amount a person types does. */
const MASK_CHARACTER = "•"

/**
 * The hidden form of a money display string: its sign stays, its digits become the mask. A
 * positive amount shows the mask alone.
 */
export function maskMoney(display: string): string {
	const negative = display.startsWith(MINUS) || display.startsWith("-")
	return negative ? `${MINUS}${AMOUNT_MASK}` : AMOUNT_MASK
}

/**
 * The draft a field takes from an `input` event: the text typed, or the held draft when the text holds the mask, which
 * Undo can put back after the focus that showed the real value.
 */
export function draftAfterInput(held: string, typed: string): string {
	return typed.includes(MASK_CHARACTER) ? held : typed
}
