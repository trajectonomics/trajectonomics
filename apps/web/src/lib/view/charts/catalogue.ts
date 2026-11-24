import type { ProjectionRun } from "../../contract"
import { reasonFor } from "./reasons"
import { resolveSeries } from "./resolve"
import { GROUPS, type GroupId, type Resolved } from "./types"

/** One series the picker lists: whether the selected plan has it, and if not, why not. */
export interface CatalogueEntry {
	readonly id: string
	readonly name: string
	readonly available: boolean
	readonly reason: string | null
	/** Whether `traj` states a figure in today's money for it. */
	readonly real: boolean
}

/** One group of the picker, with a sentence for a family the plan has none of. */
export interface CatalogueGroup {
	readonly id: GroupId
	readonly title: string
	readonly entries: readonly CatalogueEntry[]
	readonly notes: readonly string[]
}

/** The series every plan could state, always listed, so a plan without one shows it greyed out. */
const ALWAYS: readonly { id: string; name: string; group: GroupId }[] = [
	{ id: "net-worth", name: "Net worth at the close of the year", group: "net-worth" },
	{ id: "income", name: "Income", group: "money" },
	{ id: "expenses", name: "Expenses", group: "money" },
	{ id: "contributions", name: "Contributions", group: "money" },
	{ id: "unfunded", name: "Unfunded contributions", group: "money" },
	{ id: "interest", name: "Interest", group: "money" },
	{ id: "withdrawals", name: "Withdrawals", group: "money" },
	{ id: "estate:heirs", name: "What heirs would receive", group: "retirement" },
]

/** What a plan has none of, said once per group instead of as a row of greyed lines. */
const NOTES: readonly { group: GroupId; family: string; note: string }[] = [
	{ group: "net-worth", family: "account:", note: "This plan states no Account values." },
	{ group: "tax", family: "tax:", note: "This plan has no tax." },
	{ group: "retirement", family: "rule:", note: "This plan has no spending rule." },
]

/**
 * The picker's catalogue: every series any plan of the Snapshot states, plus the ones every plan could,
 * grouped. A series the selected plan lacks is listed greyed out with its reason. The ids are
 * the plan's own words (an Account id, a Levy, a Flow), so a chart made on one plan works on another.
 */
export function buildCatalogue(
	runs: readonly ProjectionRun[],
	selected: ProjectionRun | null,
	accountNames: ReadonlyMap<string, string>,
): CatalogueGroup[] {
	const has = new Set(selected ? resolveSeries(selected, accountNames).map((s) => s.id) : [])
	const known = new Map<string, { name: string; group: GroupId; real: boolean }>()
	for (const item of ALWAYS)
		known.set(item.id, { ...item, real: item.id === "net-worth" || item.id === "estate:heirs" })
	for (const run of runs) {
		for (const found of resolveSeries(run, accountNames)) {
			if (!known.has(found.id) || found.id === "net-worth") {
				known.set(found.id, { name: found.name, group: found.group, real: found.real !== null })
			}
		}
	}
	return GROUPS.map((group) => {
		const entries = [...known]
			.filter(([, item]) => item.group === group.id)
			.map(([id, item]) => entryOf(id, item, has))
		return { id: group.id, title: group.title, entries, notes: notesFor(group.id, has) }
	})
}

function entryOf(
	id: string,
	item: { name: string; real: boolean },
	has: ReadonlySet<string>,
): CatalogueEntry {
	const available = has.has(id)
	return {
		id,
		name: item.name,
		available,
		reason: available ? null : reasonFor(id, has),
		real: item.real,
	}
}

function notesFor(group: GroupId, has: ReadonlySet<string>): string[] {
	return NOTES.filter(
		(note) => note.group === group && ![...has].some((id) => id.startsWith(note.family)),
	).map((note) => note.note)
}

/** The series of a Snapshot by id, for naming a chosen series that the selected plan lacks. */
export function nameIndex(
	runs: readonly ProjectionRun[],
	accountNames: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
	const names = new Map<string, string>(ALWAYS.map((item) => [item.id, item.name]))
	for (const run of runs) {
		for (const found of resolveSeries(run, accountNames)) names.set(found.id, found.name)
	}
	return names
}

/** Every series of one run by id. */
export function seriesById(
	run: ProjectionRun,
	accountNames: ReadonlyMap<string, string>,
): ReadonlyMap<string, Resolved> {
	return new Map(resolveSeries(run, accountNames).map((item) => [item.id, item]))
}
