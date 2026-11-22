/**
 * The index of the position nearest to a target, or -1 for no positions. On a tie the earlier
 * position wins.
 */
export function nearestIndex(positions: readonly number[], target: number): number {
	let best = -1
	let bestDistance = Number.POSITIVE_INFINITY
	positions.forEach((position, index) => {
		const distance = Math.abs(position - target)
		if (distance < bestDistance) {
			best = index
			bestDistance = distance
		}
	})
	return best
}
