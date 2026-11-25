import { z } from "zod"
import type { ScenarioRow } from "../store"
import type { TaxProfileView } from "./tax/profile"
import { taxAllowancesShape } from "./tax/shown-allowances"
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

const mainShape = z
	.boolean()
	.describe("True when this is the ledger's main plan, a label and not a default (cli ADR-0071).")

const notesShape = z
	.string()
	.nullable()
	.describe(
		"The notes kept on this plan, or null when it has none. Notes are outside the document and its contentHash (cli ADR-0071).",
	)

/** What `scenario show` prints beside the document: its household, tax profile, notes and mark. */
export type ShownScenario = ScenarioView & {
	household: HouseholdDocument
	tax: StoredTax | null
	taxed: boolean
	taxAllowances?: TaxProfileView | undefined
	notes: string | null
	main: boolean
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
	taxAllowances: taxAllowancesShape.optional(),
	notes: notesShape,
	main: mainShape,
})

/** One row of `scenario list`: the summary, whether the document is taxed, has notes, is main. */
export type ListedScenario = ScenarioSummary & { taxed: boolean; hasNotes: boolean; main: boolean }

export const listedScenario: z.ZodType<ListedScenario> = z.strictObject({
	...summaryShape,
	taxed: taxedShape,
	hasNotes: z.boolean().describe("True when the plan has notes; `scenario show` prints them."),
	main: mainShape,
})

/** A Scenario `scenario notes` reports: the summary and the notes now kept. */
export type NotedScenario = ScenarioSummary & { notes: string | null }

export const notedScenario: z.ZodType<NotedScenario> = z.strictObject({
	...summaryShape,
	notes: notesShape,
})

/** Whether a document holds a tax Levy, whichever emitter wrote it (cli ADR-0032, ADR-0066). */
export function isTaxed(document: Record<string, unknown>): boolean {
	return Array.isArray(document["levies"]) && document["levies"].length > 0
}

/** The tax profile a row keeps, parsed from its stored canonical text. */
export function taxOf(row: ScenarioRow): StoredTax | null {
	return parsedTax(row.tax)
}

/** One `scenario list` row: the summary, whether the document is taxed, and the notes and main marks. */
export function listed(row: ScenarioRow): ListedScenario {
	return {
		...summary(row),
		taxed: isTaxed(view(row).document),
		hasNotes: row.notes !== null,
		main: row.main,
	}
}

/** The Scenario a notes write reports. */
export function noted(row: ScenarioRow): NotedScenario {
	return { ...summary(row), notes: row.notes }
}
