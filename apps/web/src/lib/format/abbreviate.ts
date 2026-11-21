import { MINUS } from "./money"

const UNITS = [
	{ size: 1e9, suffix: "B" },
	{ size: 1e6, suffix: "M" },
	{ size: 1e3, suffix: "k" },
] as const

/**
 * A short label for an axis tick: 1200000 becomes "1.2M", 250000 becomes "250k". Only for ticks
 * on a chart; a figure a person reads is always the CLI's own string.
 */
export function abbreviate(value: number): string {
	if (!Number.isFinite(value)) throw new RangeError("abbreviate takes a finite number")
	const magnitude = Math.abs(value)
	const unit = UNITS.find((candidate) => magnitude >= candidate.size)
	const text = unit ? `${trimmed(value / unit.size, 1)}${unit.suffix}` : trimmed(value, 2)
	return text.replace("-", MINUS)
}

function trimmed(value: number, places: number): string {
	return String(Number(value.toFixed(places)))
}
