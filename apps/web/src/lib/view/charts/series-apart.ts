import type { AccountNames } from "../account-names"
import { seriesAccount, seriesCategory, seriesLabelId } from "./series-ids"
import { clashing, numbered, type Series } from "./series-numbering"

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
		const clash = clashing(names)
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
