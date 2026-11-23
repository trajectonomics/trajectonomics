import { z } from "zod"
import { isPlainObject } from "../json"
import type { ScenarioRow } from "../store"

/** The row's metadata without its document: what `scenario list` prints. */
export type ScenarioSummary = {
	id: string
	name: string
	contentHash: string
	forkedFrom: string | null
	version: number
	createdAt: string
	updatedAt: string
}

/** One live Scenario with its document parsed as JSON: what `scenario show` prints. */
export type ScenarioView = ScenarioSummary & { document: Record<string, unknown> }

/** A Scenario a write reports; the id is null when a dry run minted it. */
export type WrittenScenario = Omit<ScenarioView, "id"> & { id: string | null }

/** A Scenario named by `scenario diff`, without its document. */
export type ScenarioRef = { id: string; name: string; contentHash: string }

export const summaryShape: {
	id: z.ZodString
	name: z.ZodString
	contentHash: z.ZodString
	forkedFrom: z.ZodNullable<z.ZodString>
	version: z.ZodNumber
	createdAt: z.ZodString
	updatedAt: z.ZodString
} = {
	id: z.string().describe("The Scenario's UUIDv7 id."),
	name: z.string().describe("The Scenario's exact, case-sensitive name."),
	contentHash: z.string().describe("jcs1:sha256 of the canonical document."),
	forkedFrom: z.string().nullable().describe("The source Scenario's id, or null."),
	version: z.number().int().describe("The row's version."),
	createdAt: z.string().describe("When the row was created."),
	updatedAt: z.string().describe("When the row was last changed."),
}

export const documentShape: z.ZodRecord<z.ZodString, z.ZodUnknown> = z
	.record(z.string(), z.unknown())
	.describe("The document parsed from the stored canonical JSON.")

export const scenarioSummary: z.ZodType<ScenarioSummary> = z.strictObject(summaryShape)
export const scenarioView: z.ZodType<ScenarioView> = z.strictObject({
	...summaryShape,
	document: documentShape,
})
export const writtenScenario: z.ZodType<WrittenScenario> = z.strictObject({
	...summaryShape,
	id: z.string().nullable().describe("The Scenario's id; null under --dry-run."),
	document: documentShape,
})
/** The household anchors a write dropped, because the document no longer holds their item. */
export const droppedAnchors: z.ZodType<string[]> = z
	.array(z.string())
	.describe(
		"The household anchors this write dropped, because the document no longer holds their item; empty when none.",
	)

/** The household a Scenario keeps, as the document it was set from; null when none is set. */
export type HouseholdDocument = Record<string, unknown> | null

export const householdShape: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>> = z
	.record(z.string(), z.unknown())
	.nullable()
	.describe("The household's document, or null when no household is set (cli ADR-0048).")

/** A Scenario a household write reports: the written Scenario with its household and anchored dates. */
export const writtenWithHousehold: z.ZodType<WrittenScenario & { household: HouseholdDocument }> =
	z.strictObject({
		...summaryShape,
		id: z.string().nullable().describe("The Scenario's id; null under --dry-run."),
		document: documentShape,
		household: householdShape,
	})

export const scenarioRef: z.ZodType<ScenarioRef> = z.strictObject({
	id: summaryShape.id,
	name: summaryShape.name,
	contentHash: summaryShape.contentHash,
})

export function summary(row: ScenarioRow): ScenarioSummary {
	return {
		id: row.id,
		name: row.name,
		contentHash: row.contentHash,
		forkedFrom: row.forkedFrom,
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}
}

export function view(row: ScenarioRow): ScenarioView {
	const document: unknown = JSON.parse(row.document)
	if (!isPlainObject(document)) throw new Error(`Scenario ${row.id} does not hold a JSON object`)
	return { ...summary(row), document }
}

/** The household a row keeps, parsed from its stored canonical text. */
export function householdOf(row: ScenarioRow): HouseholdDocument {
	if (row.household === null) return null
	const household: unknown = JSON.parse(row.household)
	if (!isPlainObject(household)) throw new Error(`Scenario ${row.id} holds no household object`)
	return household
}

export function ref(row: ScenarioRow): ScenarioRef {
	return { id: row.id, name: row.name, contentHash: row.contentHash }
}
