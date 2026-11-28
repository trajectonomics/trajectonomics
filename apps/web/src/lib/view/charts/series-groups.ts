/** The indexes of each name more than one series reads, with that name. */
export function clashGroups(names: readonly string[]): [string, number[]][] {
	const groups = new Map<string, number[]>()
	for (const [index, name] of names.entries()) {
		const same = groups.get(name) ?? []
		same.push(index)
		groups.set(name, same)
	}
	return [...groups].filter(([, indexes]) => indexes.length > 1)
}
