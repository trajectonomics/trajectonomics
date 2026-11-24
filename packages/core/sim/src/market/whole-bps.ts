import { floorDiv } from "./integer-root"

const BP = 10n ** 12n

/**
 * Whole basis points from span returns given in units of 10^-12 bp, by largest remainder: every
 * value is floored, then the one-bp surplus is handed to the values with the largest remainders
 * (the lower index first on a tie) until the sum is the exact total rounded half up. So the weighted
 * mean of equal weights is within half a bp over the bucket count of the unrounded mean, and a value
 * is never more than 1 bp from its own.
 */
export function wholeBasisPoints(numerators: readonly bigint[]): readonly bigint[] {
	const floors = numerators.map((value) => floorDiv(value, BP))
	const total = floorDiv(numerators.reduce((sum, value) => sum + value, 0n) + BP / 2n, BP)
	const surplus = Number(total - floors.reduce((sum, value) => sum + value, 0n))
	const remainders = numerators.map((value, index) => value - floors[index]! * BP)
	const order = numerators
		.map((_, index) => index)
		.sort((a, b) =>
			remainders[a]! === remainders[b]! ? a - b : remainders[a]! > remainders[b]! ? -1 : 1,
		)
	const promoted = new Set(order.slice(0, surplus))
	return floors.map((value, index) => (promoted.has(index) ? value + 1n : value))
}
