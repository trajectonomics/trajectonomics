import { MINUS } from "./money"

/**
 * A multiple the CLI states in basis points, as a person reads it: 145376 becomes "14.5×" and 249999
 * "24.9×". One decimal, truncated toward zero by integer arithmetic on the basis-point integer, so a
 * multiple below its reference never reads as the reference: this formats a ratio, never money (web ADR
 * 0002). A magnitude that truncates to zero has no sign: -999 becomes "0.0×", never "-0.0×".
 */
export function formatMultiple(basisPoints: number): string {
	if (!Number.isInteger(basisPoints))
		throw new RangeError(`not an integer of basis points: ${basisPoints}`)
	const tenths = Math.floor(Math.abs(basisPoints) / 1000)
	const sign = basisPoints < 0 && tenths !== 0 ? MINUS : ""
	return `${sign}${Math.floor(tenths / 10)}.${tenths % 10}×`
}
