/**
 * A share of the Market paths as the chance states it: the floored basis points, written as a
 * decimal percentage. The success share and a Milestone's reached share use this one format.
 */
export function shareBpsOf(paths: number, total: number): number {
	return Number((BigInt(paths) * 10000n) / BigInt(total))
}

/** The floored basis points as a decimal percentage, with no float. */
export function shareText(bps: number): string {
	return `${Math.floor(bps / 100)}.${String(bps % 100).padStart(2, "0")}%`
}
