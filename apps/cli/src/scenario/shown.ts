import { z } from "zod"
import type { ScenarioRow } from "../store"
import { parsedTax, type StoredTax, storedTax } from "./tax/stored"
import {
	documentShape,
	type HouseholdDocument,
	householdShape,
	type ScenarioSummary,
	type ScenarioView,
	summary,
	summaryShape,
	view,
} from "./view"

const taxedShape = z
	.boolean()
	.describe(
		"True when the document holds a tax Levy, whether or not a tax profile is stored beside it (cli ADR-0066).",
	)

/** What `scenario show` prints beside the document: its household and its tax profile. */
export type ShownScenario = ScenarioView & {
	household: HouseholdDocument
	tax: StoredTax | null
	taxed: boolean
}

/** `scenario show`: one live Scenario with its document, its household and its tax profile. */
export const scenarioWithHousehold: z.ZodType<ShownScenario> = z.strictObject({
	...summaryShape,
	document: documentShape,
	household: householdShape,
	tax: storedTax
		.nullable()
		.describe(
			"The tax profile `scenario tax` was given, or null when none is stored: no tax was written, or it was written before the profile was kept (cli ADR-0066).",
		),
	taxed: taxedShape,
})

/** One row of `scenario list`: the summary and whether the document holds a tax Levy. */
export type ListedScenario = ScenarioSummary & { taxed: boolean }

export const listedScenario: z.ZodType<ListedScenario> = z.strictObject({
	...summaryShape,
	taxed: taxedShape,
})

/** Whether a document holds a tax Levy, whichever emitter wrote it (cli ADR-0032, ADR-0066). */
export function isTaxed(document: Record<string, unknown>): boolean {
	return Array.isArray(document["levies"]) && document["levies"].length > 0
}

/** The tax profile a row keeps, parsed from its stored canonical text. */
export function taxOf(row: ScenarioRow): StoredTax | null {
	return parsedTax(row.tax)
}

/** One `scenario list` row: the summary and whether the document is taxed. */
export function listed(row: ScenarioRow): ListedScenario {
	return { ...summary(row), taxed: isTaxed(view(row).document) }
}
