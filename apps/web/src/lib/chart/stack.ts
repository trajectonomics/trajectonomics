/** The part of a column one series covers: its lower and upper edge, in the chart's own numbers. */
export interface Span {
	readonly lo: number
	readonly hi: number
}

/**
 * Stacks series for drawing only: `values[series][column]` is a number placed from the CLI's string, or
 * null for no value. A value at or above zero stacks upward from zero and a negative one downward, so a
 * refund never lifts the bars above it. The result is each series' span in each column; no span is ever
 * shown as a figure.
 */
export function stackSpans(values: readonly (readonly (number | null)[])[]): (Span | null)[][] {
	const columns = Math.max(0, ...values.map((row) => row.length))
	const up = new Array<number>(columns).fill(0)
	const down = new Array<number>(columns).fill(0)
	return values.map((row) =>
		Array.from({ length: columns }, (_, column) => {
			const value = row[column] ?? null
			if (value === null) return null
			if (value >= 0) {
				const lo = up[column] ?? 0
				up[column] = lo + value
				return { lo, hi: lo + value }
			}
			const hi = down[column] ?? 0
			down[column] = hi + value
			return { lo: hi + value, hi }
		}),
	)
}
