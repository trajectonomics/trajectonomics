import type { AppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import type { ScenarioRow } from "./rows"
import type { WriteOptions } from "./types"

/** Scenario writes: their inputs and what each reports (ADR-0018, ADR-0021, cli ADR-0048). */

/**
 * `expectedHash`, when given, is the content hash of the stored Scenario the caller read. A different
 * one, or none when no Scenario of the name is stored, refuses the write (cli ADR-0055).
 */
export type NewScenario = { name: string; document: unknown; expectedHash?: string | undefined }
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
/**
 * `deleted` carries `wasMain` when the tombstone also cleared the main plan, which only `force`
 * allows; `is_main` is the refusal of a delete without it (cli ADR-0071).
 */
export type ScenarioDeleted =
	| { status: "deleted"; scenario: ScenarioRow; wasMain: boolean }
	| { status: "is_main"; scenario: ScenarioRow }
	| { status: "not_found" }
/** A delete's options: a dry run, and `force`, which lets the main plan go and clears the setting. */
export type DeleteOptions = WriteOptions & { force?: boolean }

/** A rename's options: a dry run, and the content hash the caller read (cli ADR-0055). */
export type RenameOptions = WriteOptions & { expectedHash?: string | undefined }
export type ScenarioRenamed =
	| { status: "renamed" | "unchanged"; scenario: ScenarioRow }
	| { status: "name_taken"; scenario: ScenarioRow }
	| { status: "not_found" }

/** Writing a Scenario's notes; `unchanged` when the notes were already what was asked (cli ADR-0071). */
export type NotesSet =
	| { status: "updated" | "unchanged"; scenario: ScenarioRow }
	| { status: "not_found" }

/**
 * Marking or clearing the main plan: `set` when none was marked, `moved` from `previous`, `cleared`
 * when the mark was taken off, `unchanged` when the end state already held (cli ADR-0071).
 */
export type MainSet =
	| {
			status: "set" | "moved" | "cleared" | "unchanged"
			scenario: ScenarioRow | null
			previous: ScenarioRow | null
	  }
	| { status: "not_found" }

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
/** A household write's options: a dry run, and the content hash the caller read (cli ADR-0055). */
export type HouseholdOptions = WriteOptions & { expectedHash?: string | undefined }

/**
 * What a tax write puts in a Scenario: the document with its Levy, and the tax profile's canonical
 * text, or null when the profile is removed (cli ADR-0066).
 */
export type TaxPlan = { document: unknown; tax: string | null }
/** Reads the Scenario's document and its stored profile inside a tax write and says what to store. */
export type TaxPlanner = (document: ScenarioDocument, stored: string | null) => TaxPlan | AppError
export type TaxSet =
	| { status: "updated" | "unchanged"; scenario: ScenarioRow }
	| { status: "not_found" }
/** A tax write's options: a dry run, and the content hash the caller read (cli ADR-0055). */
export type TaxOptions = WriteOptions & { expectedHash?: string | undefined }

/**
 * A pure change to a fork's copy, applied inside the fork's one write. Return an `AppError`
 * (usually `invalid_input`) and the whole write rolls back.
 */
export type ScenarioTransform = (document: ScenarioDocument) => ScenarioDocument | AppError

/** `notes: false` leaves the copy without the source's notes (cli ADR-0071). */
export type ForkOptions = WriteOptions & { transform?: ScenarioTransform; notes?: boolean }
