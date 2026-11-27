const WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const SHORT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

/** A table cell for a token or request count; a missing number is `n/a`. */
export function displayCount(value: number | null): string {
	return value === null ? "n/a" : WHOLE.format(value)
}

/**
 * A compact count: plain below a thousand, then K, M, B or T with at most one decimal. The
 * decimal is cut, never rounded up, so the compact figure never claims more than the exact one.
 */
export function compactCount(value: number): string {
	const units: readonly (readonly [number, string])[] = [
		[1_000_000_000_000, "T"],
		[1_000_000_000, "B"],
		[1_000_000, "M"],
		[1_000, "K"],
	]
	for (const [size, suffix] of units) {
		if (value >= size) return `${SHORT.format(Math.floor((value * 10) / size) / 10)}${suffix}`
	}
	return SHORT.format(Math.floor(value * 10) / 10)
}
