import { isRecord } from "./json"
import { TAX_LEVY_ID } from "./levy"

/**
 * Whether a document holds the tax Levy this build writes. A stored tax profile describes that
 * Levy, so a write that leaves the document without it leaves the profile with nothing to describe
 * (cli ADR-0066).
 */
export function holdsTaxLevy(document: unknown): boolean {
	if (!isRecord(document) || !Array.isArray(document["levies"])) return false
	return document["levies"].some((levy) => isRecord(levy) && levy["id"] === TAX_LEVY_ID)
}
