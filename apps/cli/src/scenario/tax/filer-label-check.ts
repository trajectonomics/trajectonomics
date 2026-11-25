import { type AppError, fail } from "../../errors"
import type { ScenarioDocument } from "../document"
import { taxSlots } from "./filer-labels"
import { type JsonRecord, records } from "./json"
import { leviesOf, taxLeviesOf } from "./levy-ids"

/*
 * The labels a document states that its Levies do not read (cli ADR-0075). A Levy over Filers
 * reads only suffixed labels, so a bare label or one with another Filer's suffix is taxed at zero.
 * A later write or a read refuses it instead, with the way out in the hint.
 */

/** The `tally` measure labels one Levy reads, in measure order. */
function tallyLabels(levy: JsonRecord): string[] {
	const labels: string[] = []
	for (const measure of records(levy["measures"])) {
		if (measure["op"] === "tally" && typeof measure["label"] === "string") {
			labels.push(measure["label"] as string)
		}
	}
	return labels
}

/** The Filer ids a Levy reads, or null when it reads no suffixed label. */
function filerIds(levy: JsonRecord): Set<string> | null {
	const ids = new Set<string>()
	for (const label of tallyLabels(levy)) {
		const at = label.lastIndexOf("@")
		if (at > 0 && label.slice(at + 1) !== "") ids.add(label.slice(at + 1))
	}
	return ids.size === 0 ? null : ids
}

/** Whether a document's tax Levies read Filer labels, by their own `tally` measures. */
export function hasFilerLevy(document: ScenarioDocument): boolean {
	return taxLeviesOf(document).some((levy) => filerIds(levy) !== null)
}

/** The items, in document order, each once. */
function itemsOf(bad: readonly string[]): string[] {
	return [...new Set(bad)]
}

/**
 * The refusal for a document whose tax Levies read Filer labels while a Flow or an Account states a
 * label none of them tallies, or null when every stated label is read. A label is accepted only when
 * it is one of the Levies' own tallied labels, so an allowance under `@shared`, which no Levy reads,
 * is refused here rather than at projection.
 */
export function filerLabelRefusal(document: unknown): AppError | null {
	if (typeof document !== "object" || document === null) return null
	const doc = document as ScenarioDocument
	const levies = taxLeviesOf(doc)
	if (!levies.some((levy) => filerIds(levy) !== null)) return null
	const read = new Set(levies.flatMap(tallyLabels))
	const bad = taxSlots(doc).filter((slot) => !read.has(slot.label))
	if (bad.length === 0) return null
	const items = itemsOf(bad.map((slot) => slot.item))
	const [only] = levies
	return fail("invalid_input", {
		path: "document",
		message: `The tax ${
			levies.length === 1 ? `Levy "${String(only?.["id"])}" reads` : "Levies read"
		} Filer labels, so ${
			items.length === 1 ? "one item has" : `${items.length} items have`
		} a label no Levy reads: ${items.join(", ")}.`,
		hint: 'Run "traj scenario tax <name> --from-stored" to write each label with its Filer suffix.',
		details: { items },
	})
}

/**
 * The refusal for a document with a Levy that states a tax label no Levy reads, or null when every
 * stated label is read. A plan with no Levy is left alone, so its output is unchanged.
 */
export function unreadLabelRefusal(document: ScenarioDocument): AppError | null {
	const levies = leviesOf(document)
	if (levies.length === 0) return null
	const read = new Set(levies.flatMap(tallyLabels))
	const bad = taxSlots(document).filter((slot) => !read.has(slot.label))
	if (bad.length === 0) return null
	const items = itemsOf(bad.map((slot) => slot.item))
	return fail("invalid_input", {
		path: "document",
		message: `${
			items.length === 1 ? "One item states" : `${items.length} items state`
		} a tax label no Levy reads: ${items.join(", ")}.`,
		hint: 'Run "traj scenario tax <name> --from-stored" to write the labels the Levy reads.',
		details: { items },
	})
}
