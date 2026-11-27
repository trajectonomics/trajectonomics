/** How often a row's amount lands: every month, or once in its one calendar month. */
export type RateFrequency = "monthly" | "yearly"

/** Why a row is left out of the template, in the order the three are checked. */
export type LeftOut = "archived" | "negative" | "zero"

/**
 * `total / divisor` rounded half away from zero: the sign of the total times
 * `floor((2|total| + divisor) / (2 divisor))`.
 */
export function roundBy(total: bigint, divisor: bigint): bigint {
	const magnitude = total < 0n ? -total : total
	const rounded = (2n * magnitude + divisor) / (2n * divisor)
	return total < 0n ? -rounded : rounded
}

/** The covered months in which the Account moved, oldest first. */
export function activeMonthsOf(monthKeys: readonly string[], sums: readonly bigint[]): string[] {
	return monthKeys.filter((_, index) => sums[index] !== 0n)
}

/**
 * Yearly when the covered window spans at least twelve months and every active month is the same
 * calendar month; monthly otherwise. An irregular Account is stated, never dropped.
 */
export function frequencyOf(
	monthKeys: readonly string[],
	active: readonly string[],
): RateFrequency {
	if (monthKeys.length < 12) return "monthly"
	const calendarMonth = active[0]?.slice(5, 7)
	return active.every((key) => key.slice(5, 7) === calendarMonth) ? "yearly" : "monthly"
}

/** How many times the one calendar month falls in the covered window: a yearly row's divisor. */
export function yearlyCountOf(monthKeys: readonly string[], active: readonly string[]): number {
	const calendarMonth = active[0]?.slice(5, 7)
	return monthKeys.filter((key) => key.slice(5, 7) === calendarMonth).length
}

/**
 * The date a Stream starts. A monthly row starts on the As-of. A yearly row starts on the first
 * day of its calendar month at the earliest such date strictly after the As-of.
 */
export function startOf(frequency: RateFrequency, calendarMonth: string, asOf: string): string {
	if (frequency === "monthly") return asOf
	const thisYear = `${asOf.slice(0, 4)}-${calendarMonth}-01`
	return thisYear > asOf ? thisYear : `${Number(asOf.slice(0, 4)) + 1}-${calendarMonth}-01`
}

/** Why a row is not carried into the template, checked as archived, then negative, then zero. */
export function leftOutBecauseOf(archived: boolean, amount: bigint): LeftOut | undefined {
	if (archived) return "archived"
	if (amount < 0n) return "negative"
	if (amount === 0n) return "zero"
	return undefined
}
