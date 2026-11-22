import { MINUS } from "./money"

/** What a hidden amount shows in place of its digits. */
export const AMOUNT_MASK = "•••••"

/**
 * The hidden form of a money display string: its sign stays, its digits become the mask. A
 * positive amount shows the mask alone.
 */
export function maskMoney(display: string): string {
	const negative = display.startsWith(MINUS) || display.startsWith("-")
	return negative ? `${MINUS}${AMOUNT_MASK}` : AMOUNT_MASK
}
