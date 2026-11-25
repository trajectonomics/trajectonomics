import type { EditInput } from "../../edit/edit"
import { planNameError } from "../../edit/name"
import { notesError, notesOf } from "../../edit/notes"
import type { PlanRow } from "./rows"

/** What a plan's menu offers. "new" starts a plan and belongs to no row. */
export type PlanAction = "rename" | "notes" | "main" | "copy" | "delete"

/** The actions a row's menu lists, in order. The main plan is already the main plan, so it has no such action. */
export function planActions(row: PlanRow): PlanAction[] {
	const all: PlanAction[] = ["rename", "notes", "main", "copy", "delete"]
	return row.main ? all.filter((action) => action !== "main") : all
}

/** The words of each action in a menu. */
export const ACTION_LABELS: Record<PlanAction, string> = {
	rename: "Rename",
	notes: "Notes",
	main: "Make this my main plan",
	copy: "Copy plan",
	delete: "Delete plan",
}

/** Why a new name cannot rename the plan, or null when it can. */
export function renameError(
	row: PlanRow,
	newName: string,
	stored: readonly string[],
): string | null {
	if (newName.trim() === row.name) return "That is already the name of this plan."
	return planNameError(newName, stored)
}

/** The Edit that renames a plan. The hash is the one the Snapshot read, so a plan changed since is refused. */
export function renameEdit(row: PlanRow, newName: string): EditInput {
	return {
		kind: "rename-plan",
		name: row.name,
		newName: newName.trim(),
		contentHash: row.contentHash,
	}
}

/** Why the typed text cannot be notes, or null. An empty text is allowed: it clears the notes. */
export function typedNotesError(typed: string): string | null {
	return notesError(notesOf(typed))
}

/** The Edit that keeps the typed text as the plan's notes, or clears them when it is empty. */
export function notesEdit(name: string, typed: string): EditInput {
	return { kind: "set-plan-notes", name, notes: notesOf(typed) }
}

/** The Edit that marks a plan as the main plan. */
export function mainEdit(name: string): EditInput {
	return { kind: "set-main-plan", name }
}

/** Where a new plan starts: from the accounts as they are at the As-of, or as a copy of a plan. */
export type StartFrom = { from: "accounts" } | { from: "copy"; plan: string }

/** The Edit that makes a new plan. A copy is `copy-plan`; the accounts make an `apply-plan` of the template at the As-of. */
export function newPlanEdit(name: string, start: StartFrom, asOf: string): EditInput {
	const trimmed = name.trim()
	if (start.from === "copy") return { kind: "copy-plan", from: start.plan, name: trimmed }
	return { kind: "apply-plan", name: trimmed, template: { asOf } }
}
