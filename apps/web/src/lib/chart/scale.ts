import type { Extent } from "./extent"

/** A pixel range, from the start of the axis to its end. */
export interface Range {
	readonly from: number
	readonly to: number
}

/**
 * A linear map from a domain to a pixel range. A flat domain maps every value to the middle of the
 * range, so a constant series draws as a straight line.
 */
export function linearScale(domain: Extent, range: Range): (value: number) => number {
	const span = domain.max - domain.min
	if (span === 0) {
		const middle = (range.from + range.to) / 2
		return () => middle
	}
	return (value) => range.from + ((value - domain.min) / span) * (range.to - range.from)
}
