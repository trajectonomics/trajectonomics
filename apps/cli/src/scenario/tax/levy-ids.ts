import type { ScenarioDocument } from "../document"
import { type JsonRecord, records } from "./json"

/** The Levy id the CLI writes for one Return, and the prefix of the ids it writes for several. */
export const TAX_LEVY_ID: string = "th-2026-pit"

/** The id of the Levy one Filer of a separate Return files (cli ADR-0075). */
export function taxLevyIdFor(filer: string): string {
	return `${TAX_LEVY_ID}@${filer}`
}

/** Whether a Levy id is one this build writes: the joint or single `th-2026-pit`, or `th-2026-pit@<filer>`. */
export function isTaxLevyId(id: unknown): id is string {
	return typeof id === "string" && (id === TAX_LEVY_ID || id.startsWith(`${TAX_LEVY_ID}@`))
}

/** The Filer a separate Return's Levy id names, or undefined for the bare or joint id. */
export function filerOfTaxLevy(id: string): string | undefined {
	if (!id.startsWith(`${TAX_LEVY_ID}@`)) return undefined
	const filer = id.slice(TAX_LEVY_ID.length + 1)
	return filer === "" ? undefined : filer
}

/** The Levies a document declares, as JSON records, in document order. */
export function leviesOf(document: ScenarioDocument): JsonRecord[] {
	return records(document["levies"])
}

/** The Levies this build wrote for the document's Returns, in document order (cli ADR-0075). */
export function taxLeviesOf(document: ScenarioDocument): JsonRecord[] {
	return leviesOf(document).filter((levy) => isTaxLevyId(levy["id"]))
}

/** The ids of the Levies this build wrote for the document's Returns. */
export function taxLevyIds(document: ScenarioDocument): string[] {
	return taxLeviesOf(document).map((levy) => levy["id"] as string)
}
