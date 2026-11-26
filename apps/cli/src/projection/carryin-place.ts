import { type AppError, fail, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import { leviesOf } from "../scenario/tax"
import type { JsonRecord } from "../scenario/tax/json"
import { CARRY_IN_FIELD, type CarryInRecordForm } from "./carryin"
import { completedOf, placedOf, type ResolvedLevy, resolvedOf } from "./carryin-resolve"
import { fillSharedLevies } from "./carryin-shared-levies"
import type { CarryInEcho } from "./carryin-view"
import { taxNotes } from "./levies"

/** A Projection's input: the effective Scenario, the dates, and the records the flag stated. */
export type PlaceInput = {
	document: ScenarioDocument
	scenario: { id: string; name: string; path: string }
	asOf: string
	currency: string
	records: readonly CarryInRecordForm[]
}

/** What placing one side's Carry-in settled: the document the engine gets, its echo and notes. */
export type PlacedCarryIn = {
	document: ScenarioDocument
	carryIn: CarryInEcho[]
	notes: string[]
}

/** The refusal for a `--carry-in` whose Scenario holds no Levy to state anything about. */
function noLevy(scenario: string): AppError {
	return fail("invalid_input", {
		path: CARRY_IN_FIELD,
		message: `The Scenario "${scenario}" holds no Levy, so there is no Carry-in to state.`,
		hint: 'Remove --carry-in, or write a Levy into the Scenario with "traj scenario tax".',
	})
}

/** The refusal for a record that names a Levy the Scenario does not hold. */
function unknownLevy(levy: string, index: number): AppError {
	return fail("invalid_input", {
		path: `document.${index}.levy`,
		message: `The Scenario holds no Levy "${levy}", so the record cannot be placed.`,
		hint: "Name a Levy by the id the Scenario spells it with.",
	})
}

/**
 * The records this command places, or the refusal for a Scenario or Levy it does not hold. The
 * Scenario check runs before any side says it is missing a record, because only the pair knows
 * which Scenario names are valid.
 */
function selectedOf(
	input: PlaceInput,
	levies: readonly JsonRecord[],
): { record: CarryInRecordForm; index: number }[] | AppError {
	const selected = input.records
		.map((record, index) => ({ record, index }))
		.filter(
			(it) =>
				it.record.scenario === input.scenario.id || it.record.scenario === input.scenario.name,
		)
	if (selected.length > 0 && levies.length === 0) return noLevy(input.scenario.name)
	const unknown = selected.find((it) => !levies.some((levy) => levy["id"] === it.record.levy))
	return unknown === undefined ? selected : unknownLevy(unknown.record.levy, unknown.index)
}

/**
 * Places the caller's Carry-in in every Levy of the effective Scenario (ADR-0032). The flag's
 * records are matched by Scenario and Levy, checked class by class, and completed with the scope
 * record only where this build wrote the Levy; a shared loan's other-Filer classes are read from
 * that Filer's own record, and the rest is the caller's or a refusal.
 */
export function placeCarryIn(input: PlaceInput): PlacedCarryIn | AppError {
	const levies = leviesOf(input.document)
	const selected = selectedOf(input, levies)
	if (isAppError(selected)) return selected
	const completed: ResolvedLevy[] = []
	for (const levy of levies) {
		const one = resolvedOf(levy, input, selected)
		if (isAppError(one)) return one
		const done = completedOf(one)
		if (isAppError(done)) return done
		completed.push(done)
	}
	const filled = fillSharedLevies({
		levies: completed,
		path: input.scenario.path,
		currency: input.currency,
	})
	if (isAppError(filled)) return filled
	const placements: JsonRecord[] = []
	const carryIn: CarryInEcho[] = []
	for (const filledOne of filled) {
		const placed = placedOf(filledOne, input.currency)
		placements.push(placed.levy)
		carryIn.push(...placed.carryIn)
	}
	// An empty `levies` array is not the same document as no key: the engine refuses the first.
	const document: ScenarioDocument =
		levies.length === 0 ? input.document : { ...input.document, levies: placements }
	return { document, carryIn, notes: taxNotes(document, input.asOf, carryIn) }
}
