/** A series by id and the name it reads, before names are told apart. A `twinLabel` names a twin suffix instead of the id's label. */
export type Series = {
	readonly id: string
	readonly name: string
	readonly twinLabel?: string
}

function countNames(names: readonly string[]): Map<string, number> {
	const counts = new Map<string, number>()
	for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
	return counts
}

/** The indexes of each name more than one series reads. */
function clashGroups(names: readonly string[]): number[][] {
	const groups = new Map<string, number[]>()
	for (const [index, name] of names.entries()) {
		const same = groups.get(name) ?? []
		same.push(index)
		groups.set(name, same)
	}
	return [...groups.values()].filter((indexes) => indexes.length > 1)
}

/** The indexes in sorted-id order. */
function sortedBy<T extends Series>(items: readonly T[], indexes: readonly number[]): number[] {
	const idOf = (index: number) => items[index]?.id ?? ""
	return [...indexes].sort((a, b) => idOf(a).localeCompare(idOf(b)))
}

/** The clash groups by their smallest id, each one's members in sorted-id order. */
function sortedGroups<T extends Series>(items: readonly T[], names: readonly string[]): number[][] {
	const idOf = (indexes: readonly number[]) => items[indexes[0] ?? -1]?.id ?? ""
	const groups = clashGroups(names).map((indexes) => sortedBy(items, indexes))
	return groups.sort((a, b) => idOf(a).localeCompare(idOf(b)))
}

/** The entry in sorted-id order that keeps its words: a fixed one first, so a fixed name is the one that stays. */
function keeperOf<T extends Series>(
	items: readonly T[],
	sorted: readonly number[],
	fixed: ReadonlySet<string>,
): number | undefined {
	return sorted.find((index) => fixed.has(items[index]?.id ?? "")) ?? sorted[0]
}

/** One clash group numbered: the keeper keeps its words, the others take " (2)", " (3)", ... after them. */
function numberGroup<T extends Series>(
	items: readonly T[],
	names: readonly string[],
	sorted: readonly number[],
	fixed: ReadonlySet<string>,
	taken: Set<string>,
	result: string[],
): void {
	const keeper = keeperOf(items, sorted, fixed)
	const kept = names[keeper ?? -1] ?? ""
	for (const index of sorted) {
		const item = items[index]
		if (item === undefined || index === keeper || fixed.has(item.id)) continue
		let number = 2
		while (taken.has(`${kept} (${number})`)) number += 1
		const name = `${kept} (${number})`
		result[index] = name
		taken.add(name)
	}
}

/**
 * The last resort for names still equal: each clash group is numbered after its keeper's own words. The groups go
 * by their smallest id, so the result never follows the input order.
 */
export function numbered<T extends Series>(
	items: readonly T[],
	names: readonly string[],
	fixed: ReadonlySet<string>,
): string[] {
	const result = [...names]
	const taken = new Set(names)
	for (const sorted of sortedGroups(items, names))
		numberGroup(items, names, sorted, fixed, taken, result)
	return result
}

/** The names that more than one series reads, by index. */
export function clashing(names: readonly string[]): boolean[] {
	const counts = countNames(names)
	return names.map((name) => (counts.get(name) ?? 0) > 1)
}
