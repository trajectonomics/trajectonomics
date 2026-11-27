import type { AccountNames } from "../account-names"
import { seriesAccount, seriesCategory, seriesLabelId } from "./series-ids"

/** A series by id and the name it reads, before names are told apart. */
type Series = { readonly id: string; readonly name: string }

/** The twin steps a clash takes before a number: "(item)", "(item, category)", "(item, category, Account)". */
const TWIN_STEPS = 3

/**
 * The twin form a name takes at a step: "(item)", then "(item, category)", then "(item, category, Account)";
 * past those the item repeats, so a tie nothing tells apart falls to a number.
 */
function twin(item: Series, level: number, category: boolean, accounts: AccountNames): string {
	const label = seriesLabelId(item.id)
	if (level < 1) return ""
	const kind = seriesCategory(item.id)
	if (!category || level === 1 || kind === null) return ` (${label})`.repeat(level)
	const account = level >= 3 ? seriesAccount(item.id, accounts) : null
	if (account !== null) return ` (${label}, ${kind}, ${account})${` (${label})`.repeat(level - 3)}`
	return ` (${label}, ${kind})${` (${label})`.repeat(level - 2)}`
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

/** The entry in sorted-id order that keeps its words: a fixed one first, so a fixed name is the one that stays. */
function keeperOf<T extends Series>(
	items: readonly T[],
	sorted: readonly number[],
	fixed: ReadonlySet<string>,
): number | undefined {
	return sorted.find((index) => fixed.has(items[index]?.id ?? "")) ?? sorted[0]
}

/** The last resort for names still equal: the keeper keeps its words, the others take " (2)", " (3)", ... */
function numbered<T extends Series>(
	items: readonly T[],
	names: readonly string[],
	fixed: ReadonlySet<string>,
): string[] {
	const result = [...names]
	const taken = new Set(names)
	for (const indexes of clashGroups(names)) {
		const sorted = sortedBy(items, indexes)
		const keeper = keeperOf(items, sorted, fixed)
		for (const index of sorted) {
			const item = items[index]
			if (item === undefined || index === keeper || fixed.has(item.id)) continue
			let number = 2
			while (taken.has(`${item.name} (${number})`)) number += 1
			const name = `${item.name} (${number})`
			result[index] = name
			taken.add(name)
		}
	}
	return result
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
		const counts = countNames(names)
		const clash = names.map((name) => (counts.get(name) ?? 0) > 1)
		if (!clash.some(Boolean)) break
		for (const [index, item] of items.entries())
			if (clash[index] === true && !fixed.has(item.id)) levels[index] = (levels[index] ?? 0) + 1
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
