/** The ranges the plans page offers: the next 10, 20 or 30 years, or the whole plan. */
export const RANGES = [
	{ id: "10", label: "Next 10 years", years: 10 },
	{ id: "20", label: "Next 20 years", years: 20 },
	{ id: "30", label: "Next 30 years", years: 30 },
	{ id: "all", label: "Whole plan", years: null },
] as const

/** One of the ranges. */
export type Range = (typeof RANGES)[number]

/** The range an address-bar value names; an unknown one reads as the whole plan. */
export function parseRange(value: string): Range {
	return RANGES.find((range) => range.id === value) ?? RANGES[RANGES.length - 1]!
}

/**
 * The yearly rows a range draws: the first rows of the plan's annual table, as many as the range names. It
 * only chooses which of `traj`'s rows are drawn; no date is added up and no row is made.
 */
export function rowsInRange<T>(rows: readonly T[], range: Range): readonly T[] {
	return range.years === null ? rows : rows.slice(0, range.years)
}
