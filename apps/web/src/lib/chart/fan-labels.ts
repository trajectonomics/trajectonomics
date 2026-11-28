/** A direct label at the right edge of a fan chart: its words, and the y the line it names ends at. */
export interface FanLabelEnd {
	readonly text: string
	readonly y: number
}

/**
 * The fan's labels that fit, kept in the order they are given (the median first, then the band edges):
 * a label stays only when its y is at least `minGap` pixels from every label kept before it, so two
 * labels never sit on each other.
 */
export function fanLabels(ends: readonly FanLabelEnd[], minGap = 14): FanLabelEnd[] {
	const kept: FanLabelEnd[] = []
	for (const end of ends) {
		if (kept.every((other) => Math.abs(other.y - end.y) >= minGap)) kept.push(end)
	}
	return kept
}
