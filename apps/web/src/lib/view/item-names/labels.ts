/**
 * The names a Scenario document states for its own items: a Flow's and a Milestone's `displayLabel` (sim ADR 0032).
 * The document is the one the Snapshot's `scenario show` Read states (web ADR 0001), so a label the CLI never writes is
 * never shown. A label is optional: an item that states none keeps its id for the lookup to show in code.
 */
import { milestoneLabel, type ScenarioDocument } from "../../contract"

/** The labels a plan's document states, by id, for the two kinds of item that carry one. */
export interface DocumentNames {
	readonly flows: ReadonlyMap<string, string>
	readonly milestones: ReadonlyMap<string, string>
}

/** The labels of a page with no document: every Flow and Milestone shows by id. */
export const NO_DOCUMENT_NAMES: DocumentNames = { flows: new Map(), milestones: new Map() }

/** The labels one list states, by id: two items that state the same one take their id, so a page can tell them apart. */
function labelsFrom(entries: readonly (readonly [string, string])[]): ReadonlyMap<string, string> {
	const counts = new Map<string, number>()
	for (const [, label] of entries) counts.set(label, (counts.get(label) ?? 0) + 1)
	return new Map(
		entries.map(([id, label]) => [id, counts.get(label) === 1 ? label : `${label} (${id})`]),
	)
}

/** One list's labels, by id: an item with no `displayLabel` is left out, so the lookup falls back to the id. */
function labelsOf(
	items: readonly { id: string; displayLabel?: string | undefined }[] | undefined,
): ReadonlyMap<string, string> {
	return labelsFrom(
		(items ?? []).flatMap((item) =>
			typeof item.displayLabel === "string" ? [[item.id, item.displayLabel] as const] : [],
		),
	)
}

/** The labels a document states for its Milestones: each entry is read through `milestoneLabel`, and never copied back. */
function milestoneLabelsOf(items: readonly unknown[] | undefined): ReadonlyMap<string, string> {
	return labelsFrom(
		(items ?? []).flatMap((item) => {
			const read = milestoneLabel.safeParse(item)
			if (!read.success || read.data.displayLabel === undefined) return []
			return [[read.data.id, read.data.displayLabel] as const]
		}),
	)
}

/** The labels one plan's document states; empty for a plan with no document or none set. */
export function documentNames(doc: ScenarioDocument | null): DocumentNames {
	if (doc === null) return NO_DOCUMENT_NAMES
	return { flows: labelsOf(doc.flows), milestones: milestoneLabelsOf(doc.milestones) }
}
