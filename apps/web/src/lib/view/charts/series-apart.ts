import type { AccountNames } from "../account-names"
import { seriesLabelId } from "./series-ids"
import { numbered, type Series } from "./series-numbering"
import { clashGroups, TWIN_STEPS, tellGroup, twin } from "./series-twins"

/** Raises the level each item of one clash group takes. */
function raiseLevels<T extends Series>(
	items: readonly T[],
	levels: number[],
	name: string,
	indexes: readonly number[],
	category: readonly boolean[],
	fixed: ReadonlySet<string>,
	accounts: AccountNames,
): void {
	const moving = indexes.filter((index) => !fixed.has(items[index]?.id ?? ""))
	if (moving.length === 0) return
	const from = Math.max(...moving.map((index) => levels[index] ?? 0))
	for (const [index, level] of tellGroup(name, items, moving, from, category, accounts))
		levels[index] = level
}

/**
 * The names told apart: each clash takes the twin forms, then a number in sorted-id order. A `fixed` entry keeps
 * its name. No name is ever a series key (web ADR 0029).
 */
export function apart<T extends Series>(
	items: readonly T[],
	fixed: ReadonlySet<string> = new Set(),
	accounts: AccountNames = new Map(),
): T[] {
	const keys = items.map((item) => `${item.name}\u0000${seriesLabelId(item.id)}`)
	const category = keys.map((key) => keys.filter((other) => other === key).length > 1)
	const levels = items.map(() => 0)
	let names = items.map((item) => item.name)
	for (let round = 0; round <= TWIN_STEPS; round += 1) {
		names = items.map(
			(item, index) =>
				`${item.name}${twin(item, levels[index] ?? 0, category[index] === true, accounts)}`,
		)
		const groups = clashGroups(names)
		if (groups.length === 0) break
		for (const [name, indexes] of groups)
			raiseLevels(items, levels, name, indexes, category, fixed, accounts)
	}
	const told = numbered(items, names, fixed)
	return items.map((item, index) => ({ ...item, name: told[index] ?? item.name }))
}

/** The same series, each with a name no other shares: clashes take the twin forms, then a number (web ADR 0029). */
export function distinctNames<T extends Series>(
	items: readonly T[],
	accounts: AccountNames = new Map(),
): T[] {
	return apart(items, new Set(), accounts)
}
