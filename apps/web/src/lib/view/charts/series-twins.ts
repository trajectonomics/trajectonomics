import type { AccountNames } from "../account-names"
import { seriesAccount, seriesCategory, seriesLabelId } from "./series-ids"
import type { Series } from "./series-numbering"

/** The twin steps a clash takes before a number: "(item)", "(item, category)", "(item, category, Account)". */
export const TWIN_STEPS = 3

/** A word, or a run of symbols (an emoji category still counts); a symbol never swallows the word after it, and invisible characters say nothing. */
const PIECES = /[\p{L}\p{M}\p{N}]+|\p{S}+/gu

/** The pieces a name says, in lower case, so a suffix that only repeats them adds no information. */
function piecesOf(text: string): ReadonlySet<string> {
	return new Set(text.toLowerCase().match(PIECES) ?? [])
}

/** Whether a twin suffix says a piece the name does not already say. */
function informs(name: string, suffix: string): boolean {
	const said = piecesOf(name)
	return (suffix.toLowerCase().match(PIECES) ?? []).some((piece) => !said.has(piece))
}

/**
 * The twin form a name takes at a step: "(item)", then "(item, category)", then "(item, category, Account)";
 * past those the item repeats, so a tie nothing tells apart falls to a number.
 */
export function twin(
	item: Series,
	level: number,
	category: boolean,
	accounts: AccountNames,
): string {
	const label = item.twinLabel ?? seriesLabelId(item.id)
	if (level < 1) return ""
	const kind = seriesCategory(item.id)
	if (!category || level === 1 || kind === null) return ` (${label})`.repeat(level)
	const account = level >= 3 ? seriesAccount(item.id, accounts) : null
	if (account !== null) return ` (${label}, ${kind}, ${account})${` (${label})`.repeat(level - 3)}`
	return ` (${label}, ${kind})${` (${label})`.repeat(level - 2)}`
}

/** The twin suffix each item of a group would take at `step`, in the group's order. */
function suffixesAt(
	items: readonly Series[],
	indexes: readonly number[],
	step: number,
	category: readonly boolean[],
	accounts: AccountNames,
): string[] {
	return indexes.map((index) => {
		const item = items[index]
		return item === undefined ? "" : twin(item, step, category[index] === true, accounts)
	})
}

/**
 * Whether a step tells a group apart: a suffix adds a word, or the suffixes left tied differ from each other or from
 * those a kept series (`held`, one whose name is fixed) would take, so a lone moving series still states its category.
 */
function splits(
	name: string,
	suffixes: readonly string[],
	held: readonly string[],
): { moves: boolean[]; split: boolean } {
	const moves = suffixes.map((suffix) => informs(name, suffix))
	const stay = suffixes.filter((_, at) => moves[at] !== true)
	return { moves, split: stay.length > 0 && new Set([...stay, ...held]).size > 1 }
}

/** The level a group's items take at a step: a splitting or word-adding item moves, the rest stay where they are. */
function levelsOf(
	indexes: readonly number[],
	moves: readonly boolean[],
	split: boolean,
	step: number,
	stay: number,
): Map<number, number> {
	return new Map(
		indexes.map((index, at): [number, number] => [
			index,
			split || moves[at] === true ? step : stay,
		]),
	)
}

/**
 * The level each item of one clash group takes: the first step that adds a word to the name, or whose suffixes
 * differ for the items it leaves behind, so a step is skipped only when it adds no word and leaves them alike.
 */
export function tellGroup(
	name: string,
	items: readonly Series[],
	indexes: readonly number[],
	from: number,
	category: readonly boolean[],
	accounts: AccountNames,
	held: readonly number[] = [],
): Map<number, number> {
	for (let step = from + 1; step <= TWIN_STEPS; step += 1) {
		const suffixes = suffixesAt(items, indexes, step, category, accounts)
		const { moves, split } = splits(
			name,
			suffixes,
			suffixesAt(items, held, step, category, accounts),
		)
		if (split || moves.some(Boolean)) return levelsOf(indexes, moves, split, step, from)
	}
	return levelsOf(indexes, [], false, from, from)
}
