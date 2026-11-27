/**
 * Orders rows largest first by one number, keeping the input order for a tie and putting a row
 * with no number after every row that has one.
 */
export function rankBy<T>(rows: readonly T[], value: (row: T) => number | null): T[] {
	return rows
		.map((row, index) => ({ row, index, value: value(row) }))
		.sort((left, right) => {
			if (left.value === null && right.value === null) return left.index - right.index
			if (left.value === null) return 1
			if (right.value === null) return -1
			return right.value - left.value || left.index - right.index
		})
		.map((entry) => entry.row)
}
