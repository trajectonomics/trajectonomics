/**
 * A multiple the CLI states in basis points, as a person reads it: 145376 becomes "14.5×" and 250000
 * "25.0×". One decimal, rounded half up, by integer arithmetic on the basis-point integer: this formats a
 * ratio, never money (web ADR 0002).
 */
export function formatMultiple(basisPoints: number): string {
	if (!Number.isInteger(basisPoints))
		throw new RangeError(`not an integer of basis points: ${basisPoints}`)
	const negative = basisPoints < 0
	const magnitude = Math.abs(basisPoints)
	const tenths = Math.floor((magnitude + 500) / 1000)
	const whole = Math.floor(tenths / 10)
	return `${negative ? "-" : ""}${whole}.${tenths % 10}×`
}
