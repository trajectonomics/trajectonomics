/** Reordering a routing list: pure moves of one row, used by the drag and by the up and down buttons. */

/** The list with the item at `from` moved to `to`. An index outside the list changes nothing. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
	if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length)
		return [...list]
	const next = [...list]
	const [item] = next.splice(from, 1)
	if (item !== undefined) next.splice(to, 0, item)
	return next
}

/** The list with the item at `index` moved one place up (-1) or down (1). */
export function nudged<T>(list: readonly T[], index: number, by: -1 | 1): T[] {
	return moved(list, index, index + by)
}

/** Whether two lists hold the same items in the same order (by JSON, as the document holds them). */
export function sameOrder(a: readonly unknown[], b: readonly unknown[]): boolean {
	return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * The index each row of a reordered list had before it moved, so a refusal of the new order lands on the row that
 * caused it. `before[i]` rows are matched by their JSON, first unused match.
 */
export function origins<T>(before: readonly T[], after: readonly T[]): number[] {
	const used = new Set<number>()
	return after.map((item) => {
		const at = before.findIndex(
			(one, i) => !used.has(i) && JSON.stringify(one) === JSON.stringify(item),
		)
		if (at >= 0) used.add(at)
		return at
	})
}
