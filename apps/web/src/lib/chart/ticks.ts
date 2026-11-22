import type { Extent } from "./extent"

/**
 * Round tick values that cover a domain, at 1, 2 or 5 times a power of ten. The first and last tick
 * enclose the domain, so a chart drawn to them loses no value.
 */
export function niceTicks(domain: Extent, count = 5): number[] {
	if (count < 2) throw new RangeError("niceTicks needs at least two ticks")
	const span = domain.max - domain.min
	if (span === 0) return [roundedTick(domain.min)]
	const step = niceStep(span / (count - 1))
	const first = Math.floor(domain.min / step) * step
	const steps = Math.round((Math.ceil(domain.max / step) * step - first) / step)
	return Array.from({ length: steps + 1 }, (_, index) => roundedTick(first + index * step))
}

function niceStep(rough: number): number {
	const base = 10 ** Math.floor(Math.log10(rough))
	const fraction = rough / base
	if (fraction < 1.5) return base
	if (fraction < 3) return 2 * base
	if (fraction < 7) return 5 * base
	return 10 * base
}

/** Removes the binary noise a step leaves in a tick, such as 0.30000000000000004. */
function roundedTick(value: number): number {
	return Number(value.toPrecision(12))
}
