import type { AppError } from "../errors"
import { scenarioChanged } from "../scenario/errors"
import type { Ctx } from "./context"
import { write } from "./guard"
import { iso } from "./ids"
import { liveScenario, mainScenario } from "./scenario-read"
import type {
	MainSet,
	NotesSet,
	RenameOptions,
	ScenarioRenamed,
	ScenarioRow,
	WriteOptions,
} from "./types"

/**
 * What a person keeps beside a plan, outside its document and its content hash: its name, its
 * notes and whether it is the main plan. Each write bumps the row's `version` and `updatedAt` and
 * touches no other column (cli ADR-0071).
 */
function touch(ctx: Ctx, id: string, set: string, value: string | number | null): void {
	ctx.db.run(
		`UPDATE scenario SET ${set} = ?2, version = version + 1, updated_at = ?3 WHERE id = ?1`,
		[id, value, iso(ctx.clock())],
	)
}

/** Renames a live Scenario in place: same id, document and hash; a taken name is a status. */
export function renameScenario(
	ctx: Ctx,
	id: string,
	name: string,
	options: RenameOptions = {},
): ScenarioRenamed | AppError {
	return write(
		ctx.db,
		() => {
			const current = liveScenario(ctx, "id", id)
			if (!current) return { status: "not_found" }
			const expected = options.expectedHash
			if (expected !== undefined && current.contentHash !== expected) {
				return scenarioChanged(current.name, expected, current.contentHash)
			}
			if (current.name === name) return { status: "unchanged", scenario: current }
			const taken = liveScenario(ctx, "name", name)
			if (taken) return { status: "name_taken", scenario: taken }
			touch(ctx, id, "name", name)
			return { status: "renamed", scenario: liveScenario(ctx, "id", id)! }
		},
		options,
	)
}

/** Sets a live Scenario's notes, or clears them with null. */
export function setScenarioNotes(
	ctx: Ctx,
	id: string,
	notes: string | null,
	options: WriteOptions = {},
): NotesSet | AppError {
	return write(
		ctx.db,
		() => {
			const current = liveScenario(ctx, "id", id)
			if (!current) return { status: "not_found" }
			if (current.notes === notes) return { status: "unchanged", scenario: current }
			touch(ctx, id, "notes", notes)
			return { status: "updated", scenario: liveScenario(ctx, "id", id)! }
		},
		options,
	)
}

/** Takes the main-plan mark off the plan that holds it, if any. */
function clearMain(ctx: Ctx, previous: ScenarioRow | null): MainSet {
	if (previous === null) return { status: "unchanged", scenario: null, previous: null }
	touch(ctx, previous.id, "main", 0)
	return { status: "cleared", scenario: null, previous: liveScenario(ctx, "id", previous.id) }
}

/** Marks `target`, taking the mark off `previous` first, since the index allows one. */
function markMain(ctx: Ctx, target: ScenarioRow, previous: ScenarioRow | null): MainSet {
	if (previous?.id === target.id) return { status: "unchanged", scenario: target, previous: null }
	if (previous !== null) touch(ctx, previous.id, "main", 0)
	touch(ctx, target.id, "main", 1)
	return {
		status: previous === null ? "set" : "moved",
		scenario: liveScenario(ctx, "id", target.id),
		previous: previous === null ? null : liveScenario(ctx, "id", previous.id),
	}
}

/**
 * Marks a live Scenario as the ledger's main plan, or takes the mark off with null. The one live
 * main plan moves in one write: the old row is cleared before the new one is marked.
 */
export function setMainScenario(
	ctx: Ctx,
	id: string | null,
	options: WriteOptions = {},
): MainSet | AppError {
	return write(
		ctx.db,
		() => {
			const previous = mainScenario(ctx)
			if (id === null) return clearMain(ctx, previous)
			const target = liveScenario(ctx, "id", id)
			return target ? markMain(ctx, target, previous) : { status: "not_found" }
		},
		options,
	)
}
