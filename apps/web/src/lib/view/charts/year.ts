import type { Pt } from "./types"

/** The calendar year of a YYYY-MM-DD date, read from its text: where a period ends on the x axis. Never a date computation. */
export function yearOf(date: string): number {
	return Number(date.slice(0, 4))
}

/** A point at the year a period ends in, carrying the CLI's string untouched. */
export function pointAt(date: string, amount: string): Pt {
	return { x: yearOf(date), label: date.slice(0, 4), date, amount }
}

/**
 * Gives each later point that ends in the same calendar year as an earlier one of its series its own
 * place just after it, and names it by month: a Projection that ends part-way into a year has two periods
 * ending in it, and neither is dropped. The figures are untouched.
 */
export function spread(points: readonly Pt[]): Pt[] {
	const seen = new Map<number, number>()
	return points.map((point) => {
		const count = seen.get(point.x) ?? 0
		seen.set(point.x, count + 1)
		return count === 0
			? point
			: { ...point, x: point.x + count / 10, label: point.date.slice(0, 7) }
	})
}
