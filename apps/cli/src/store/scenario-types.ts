import type { AppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import type { ScenarioRow } from "./rows"
import type { WriteOptions } from "./types"

/** Scenario writes: their inputs and what each reports (ADR-0018, ADR-0021, cli ADR-0048). */

export type NewScenario = { name: string; document: unknown }
/**
 * `droppedAnchors` names the household anchors whose item the written document no longer holds;
 * the household no longer keeps them (cli ADR-0048). It is empty when none was dropped.
 */
export type ScenarioSaved = {
	status: "created" | "updated" | "unchanged"
	scenario: ScenarioRow
	droppedAnchors: string[]
}
export type ScenarioForked =
	| { status: "forked" | "name_taken"; scenario: ScenarioRow; droppedAnchors: string[] }
	| { status: "not_found" }
export type ScenarioDeleted = { status: "deleted"; scenario: ScenarioRow } | { status: "not_found" }

/**
 * What a household write puts in a Scenario: the document after its anchors are placed, and the
 * household's canonical text, or null when the household is removed.
 */
export type HouseholdPlan = { document: unknown; household: string | null }
/** Reads the Scenario's document inside a household write and says what to store. */
export type HouseholdPlanner = (document: ScenarioDocument) => HouseholdPlan | AppError
export type HouseholdSet =
	| { status: "updated" | "unchanged"; scenario: ScenarioRow }
	| { status: "not_found" }

/**
 * A pure change to a fork's copy, applied inside the fork's one write. Return an `AppError`
 * (usually `invalid_input`) and the whole write rolls back.
 */
export type ScenarioTransform = (document: ScenarioDocument) => ScenarioDocument | AppError

export type ForkOptions = WriteOptions & { transform?: ScenarioTransform }
