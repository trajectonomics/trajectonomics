import { isPlainObject } from "../json"
import { TAX_LEVY_ID } from "./tax/levy"

/** The ids of the Levies a document holds; anything that is not a Levy list holds none. */
function levyIds(document: unknown): string[] {
	if (!isPlainObject(document) || !Array.isArray(document["levies"])) return []
	return document["levies"].flatMap((levy) =>
		isPlainObject(levy) && typeof levy["id"] === "string" ? [levy["id"]] : [],
	)
}

function parsed(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		return undefined
	}
}

/**
 * What an apply took away that the new document did not say it would: the Levies the stored
 * Scenario held and the document no longer holds. Re-applying a document written before `scenario
 * tax` removes the tax silently, so the result says so and names the command that restores it.
 */
export function removedLevyNotes(
	storedDocument: string | undefined,
	applied: unknown,
	dryRun: boolean,
): string[] {
	if (storedDocument === undefined) return []
	const kept = new Set(levyIds(applied))
	const removed = levyIds(parsed(storedDocument)).filter((id) => !kept.has(id))
	const again = removed.includes(TAX_LEVY_ID) ? "; run traj scenario tax again" : ""
	const be = dryRun ? "would be" : "was"
	return removed.map((id) =>
		kept.size === 0
			? `The document has no levies, so the Levy "${id}" ${be} removed${again}.`
			: `The document does not hold the Levy "${id}", so it ${be} removed${again}.`,
	)
}
