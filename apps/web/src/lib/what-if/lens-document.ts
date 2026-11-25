/**
 * The What-if lens of a planner page (glossary): a plan's document with the session's changes put in, for the planner pages to show what the what-if holds
 * beside what the plan stores. It is object editing and nothing else: a Set replaces the value at its path,
 * and a Removal takes the item out by its id, the same two things `traj` does when it applies the Overrides
 * (cli ADR 0056). No amount is read or changed, so the page still computes no figure.
 */
import type { ScenarioDocument } from "../contract"
import type { Json, SetChange } from "./overrides"

type Item = { id: string } & Record<string, unknown>

/** Puts `value` at `keys` inside `target`, copying each object it goes through. A path that is not there is left alone. */
function put(target: unknown, keys: readonly string[], value: Json): unknown {
	const [head, ...rest] = keys
	if (head === undefined) return value
	if (typeof target !== "object" || target === null || Array.isArray(target)) return target
	const record = target as Record<string, unknown>
	if (!(head in record)) return target
	return { ...record, [head]: put(record[head], rest, value) }
}

/** One list of the document with its items edited: removals first, then the Sets that name an item of it. */
function listWith(
	list: string,
	items: readonly Item[],
	changes: { sets: readonly SetChange[]; removals: readonly string[] },
): Item[] {
	return items
		.filter((item) => !changes.removals.includes(`${list}.${item.id}`))
		.map((item) =>
			changes.sets.reduce((edited, set) => {
				const [name, id, ...field] = set.path.split(".")
				if (name !== list || id !== item.id) return edited
				// A whole item Set (`accounts.fund`) takes the item's place; a field Set puts the value at its path.
				return field.length === 0 ? (set.value as Item) : (put(edited, field, set.value) as Item)
			}, item),
		)
}

/** The changes of a session that holds none. */
export const NO_CHANGES = { sets: [], removals: [] } as const

/** The document the what-if reads: its Flows and Accounts without the removed items and with the Sets put in. */
export function lensDocument(
	doc: ScenarioDocument,
	changes: { sets: readonly SetChange[]; removals: readonly string[] },
): ScenarioDocument {
	return {
		...doc,
		flows: listWith("flows", doc.flows, changes) as unknown as ScenarioDocument["flows"],
		accounts: listWith(
			"accounts",
			doc.accounts,
			changes,
		) as unknown as ScenarioDocument["accounts"],
	}
}

/** The Account with this id as the session shows it, or null: where a drawer that tries a value starts its form, so a new try carries the earlier ones. */
export function shownAccount(
	doc: ScenarioDocument,
	changes: { sets: readonly SetChange[]; removals: readonly string[] } | null,
	id: string | undefined,
): ScenarioDocument["accounts"][number] | undefined {
	return lensDocument(doc, changes ?? NO_CHANGES).accounts.find((one) => one.id === id)
}
