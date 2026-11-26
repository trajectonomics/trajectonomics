import type { ProjectionRun } from "../../contract"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { annualFigures } from "./resolve-annual"
import { accountFigures, cashflowFigures } from "./resolve-flows"
import { retirementFigures, taxFigures } from "./resolve-later"
import type { Resolved } from "./types"

const CASH = "cash:"
const ACCOUNT = "account:"

/** A series by id and the name it reads, before names are told apart. */
type Series = { readonly id: string; readonly name: string }

function bare(id: string): string {
	return id.startsWith(ACCOUNT) ? id.slice(ACCOUNT.length) : id
}

function cashFields(seriesId: string): unknown[] | null {
	if (!seriesId.startsWith(CASH)) return null
	try {
		return JSON.parse(seriesId.slice(CASH.length)) as unknown[]
	} catch {
		return null
	}
}

/**
 * The item a cash-flow series names (`cash:[group, id, account, category]`): the Flow or category id, else the
 * Account, else "no category". Any other series answers its own id (web ADR 0029).
 */
export function seriesLabelId(seriesId: string): string {
	const fields = cashFields(seriesId)
	if (fields === null) return bare(seriesId)
	const [, itemId, account] = fields
	if (typeof itemId === "string") return bare(itemId)
	if (typeof account === "string") return bare(account)
	return "no category"
}

function seriesCategory(seriesId: string): string | null {
	const fields = cashFields(seriesId)
	if (fields === null) return null
	return typeof fields[3] === "string" ? fields[3] : "no category"
}

/** The twin form a name takes at a step: "(item)", then "(item, category)", and the item again after that. */
function twin(item: Series, level: number, category: boolean): string {
	const label = seriesLabelId(item.id)
	const kind = seriesCategory(item.id)
	if (category && kind !== null && level >= 2) {
		return ` (${label}, ${kind})${` (${label})`.repeat(level - 2)}`
	}
	return ` (${label})`.repeat(level)
}

function countNames(names: readonly string[]): Map<string, number> {
	const counts = new Map<string, number>()
	for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
	return counts
}

/** The names told apart: each clash takes the twin form, repeated until every name is unique. A `fixed` entry keeps its name. */
export function apart<T extends Series>(
	items: readonly T[],
	fixed: ReadonlySet<string> = new Set(),
): T[] {
	const keys = items.map((item) => `${item.name}\u0000${seriesLabelId(item.id)}`)
	const category = keys.map((key) => keys.filter((other) => other === key).length > 1)
	const levels = items.map(() => 0)
	let names = items.map((item) => item.name)
	let counts = countNames(names)
	for (let round = 0; round <= items.length; round += 1) {
		names = items.map(
			(item, index) => `${item.name}${twin(item, levels[index] ?? 0, category[index] === true)}`,
		)
		counts = countNames(names)
		const clash = names.map((name) => (counts.get(name) ?? 0) > 1)
		if (!clash.some(Boolean)) break
		for (const [index, item] of items.entries())
			if (clash[index] === true && !fixed.has(item.id)) levels[index] = (levels[index] ?? 0) + 1
	}
	return items.map((item, index) =>
		(counts.get(names[index] ?? "") ?? 0) > 1 && !fixed.has(item.id)
			? { ...item, name: `${item.name} (${item.id})` }
			: { ...item, name: names[index] ?? item.name },
	)
}

export function distinctNames<T extends Series>(items: readonly T[]): T[] {
	return apart(items)
}

/** Every yearly series a run states, by id, before names are told apart. */
export function rawSeries(run: ProjectionRun, names: ItemNames = NO_ITEM_NAMES): Resolved[] {
	return [
		...annualFigures(run),
		...accountFigures(run, names),
		...cashflowFigures(run, names),
		...taxFigures(run),
		...retirementFigures(run),
	]
}

/** The one id → name map: the selected plan keeps its chart names, and every other series has one name, in any run order. */
export function seriesNames(
	runs: readonly ProjectionRun[],
	selected: ProjectionRun | null,
	names: ItemNames,
	base: ReadonlyMap<string, string> = new Map(),
): ReadonlyMap<string, string> {
	const known = new Map<string, { id: string; name: string; fixed: boolean }>()
	for (const [id, name] of base) known.set(id, { id, name, fixed: true })
	for (const series of runs.flatMap((run) => rawSeries(run, names)))
		if (!known.has(series.id))
			known.set(series.id, { id: series.id, name: series.name, fixed: false })
	for (const series of selected === null ? [] : distinctNames(rawSeries(selected, names)))
		known.set(series.id, { id: series.id, name: series.name, fixed: true })
	const fixed = new Set([...known.values()].flatMap((item) => (item.fixed ? [item.id] : [])))
	return new Map(apart([...known.values()], fixed).map((item) => [item.id, item.name]))
}
