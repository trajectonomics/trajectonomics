/** Adds a number picked from every item. */
export function sumOf<T>(items: readonly T[], value: (item: T) => number): number {
	let sum = 0
	for (const item of items) sum += value(item)
	return sum
}

/** Adds the values that are present; null when every value is missing. */
export function sumNullable(values: readonly (number | null)[]): number | null {
	let sum = 0
	let seen = false
	for (const value of values) {
		if (value === null) continue
		sum += value
		seen = true
	}
	return seen ? sum : null
}
