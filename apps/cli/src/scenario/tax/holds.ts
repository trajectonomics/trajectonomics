import { isRecord } from "./json"
import { isTaxLevyId } from "./levy-ids"

/** The tax Levies a document holds, in document order (cli ADR-0075). */
export function taxLeviesIn(document: unknown): Record<string, unknown>[] {
	if (!isRecord(document) || !Array.isArray(document["levies"])) return []
	return document["levies"].filter(
		(levy): levy is Record<string, unknown> => isRecord(levy) && isTaxLevyId(levy["id"]),
	)
}

/**
 * Whether a document holds a tax Levy this build writes. A stored tax profile describes those
 * Levies, so a write that leaves the document without them leaves the profile with nothing to
 * describe (cli ADR-0066).
 */
export function holdsTaxLevy(document: unknown): boolean {
	return taxLeviesIn(document).length > 0
}
