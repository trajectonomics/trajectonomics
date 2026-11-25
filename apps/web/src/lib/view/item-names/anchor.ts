/** An anchor in words: the item whose date it pins, which date, and who pins it. */
import type { HouseholdAnchor } from "../../contract"
import { type ItemKind, type ItemNames, itemText } from "./names"
import { NO_PEOPLE, type PersonNames } from "./people"

/** The item a dotted path of the CLI names: the list (`flows`) and the id (`salary`), and the date field it ends in. */
export interface AnchorTarget {
	readonly kind: ItemKind
	readonly id: string
	/** "start" or "end". */
	readonly edge: "start" | "end"
}

const KINDS: Readonly<Record<string, ItemKind>> = {
	flows: "flow",
	accounts: "account",
	milestones: "milestone",
}

/** The item and the date an anchor's path names (`flows.salary.end`), or null for a path this page has no words for. */
export function anchorTarget(path: string): AnchorTarget | null {
	const [list, id, edge, ...rest] = path.split(".")
	const kind = KINDS[list ?? ""]
	if (kind === undefined || id === undefined || id === "" || rest.length > 0) return null
	return edge === "start" || edge === "end" ? { kind, id, edge } : null
}

/** What an anchor pins the date to: "age 60", "life end" or "joining". */
export function pinnedTo(anchor: HouseholdAnchor): string {
	if ("age" in anchor) return `age ${anchor.age}`
	return anchor.at === "lifeEnd" ? "life end" : "joining"
}

/** The person an anchor names, called by the household's words: "you", "your partner", or the id when none is stated. */
export function anchorPerson(anchor: HouseholdAnchor, people: PersonNames = NO_PEOPLE): string {
	return people.get(anchor.person)?.subject ?? anchor.person
}

/** An anchor beside a date: "at you, age 60", "at you, life end" or "at your partner, joining". */
export function anchorWords(anchor: HouseholdAnchor, people: PersonNames = NO_PEOPLE): string {
	return `at ${anchorPerson(anchor, people)}, ${pinnedTo(anchor)}`
}

/** One anchor as a row: the item whose date it pins (null for a path with no words), which date, and who pins it. */
export interface AnchorRow {
	readonly path: string
	readonly target: AnchorTarget | null
	/** "starts" or "ends" for a path with words; the whole path otherwise. */
	readonly edge: string
	/** "at you, age 60". */
	readonly when: string
	/** The row as plain text, for a label that cannot hold markup: "salary ends". */
	readonly plain: string
}

/** The row of an anchor: its item named by the lookup, the date it pins and the person, called by the household's words. */
export function anchorRow(anchor: HouseholdAnchor, names: ItemNames): AnchorRow {
	const target = anchorTarget(anchor.path)
	const when = anchorWords(anchor, names.people)
	if (target === null)
		return { path: anchor.path, target, edge: anchor.path, when, plain: anchor.path }
	const edge = target.edge === "start" ? "starts" : "ends"
	return {
		path: anchor.path,
		target,
		edge,
		when,
		plain: `${itemText(names, target.kind, target.id)} ${edge}`,
	}
}
