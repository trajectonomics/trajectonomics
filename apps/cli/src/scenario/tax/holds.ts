import { isRecord } from "./json"
import { TAX_LEVY_ID } from "./levy"

/**
 * Whether a document holds the tax Levy this build writes. A stored tax profile describes that
 * Levy, so a write that leaves the document without it leaves the profile with nothing to describe
 * (cli ADR-0066).
 */
export function holdsTaxLevy(document: unknown): boolean {
	return taxLevyIn(document) !== undefined
}

/** The tax Levy a document holds, or `undefined` when it holds none. */
export function taxLevyIn(document: unknown): Record<string, unknown> | undefined {
	if (!isRecord(document) || !Array.isArray(document["levies"])) return undefined
	return document["levies"].find((levy) => isRecord(levy) && levy["id"] === TAX_LEVY_ID)
}
