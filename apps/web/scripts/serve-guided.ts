// The guided plan's run: one Edit that runs two writes, the plan and then its household
// ([web ADR 0031](../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
// The template is read first, the document is built from the answers, and each write runs dry before it runs for
// real. A refused household removes the plan this Edit just made, so a plan without its household is never left.
import { z } from "zod"
import type { ErrorBody } from "../src/lib/contract"
import {
	guidedApplyCommand,
	guidedHouseholdCommand,
	guidedRemoveCommand,
	guidedTemplateRead,
} from "../src/lib/edit/edit-guided"
import { guidedDocument } from "../src/lib/edit/guided-document"
import { type GuidedEdit, guidedHousehold } from "../src/lib/edit/guided-edit"
import { droppedOf, type EditRun, nameTaken, wasCreated } from "./edit-run"
import { type RunContext, runTraj } from "./run-traj"

/** The refusal of a plan that landed without its household, because removing it failed as well. */
function halfSaved(name: string): ErrorBody {
	return {
		code: "guided_plan_half_saved",
		exitCode: 1,
		message: `The plan ${name} was saved without its household. Delete it on Plans, then try again.`,
	}
}

/** The plan a refused household leaves behind: removed and the household's own error answered, or half saved. */
async function removePlan(
	context: RunContext,
	edit: GuidedEdit,
	error: ErrorBody,
): Promise<EditRun> {
	const removed = await runTraj(context, guidedRemoveCommand(edit.name), z.unknown())
	return { ok: false, error: removed.ok ? error : halfSaved(edit.name) }
}

/** Writes the household dry and then for real; the first refusal, or null once both ran. */
async function writeHousehold(context: RunContext, edit: GuidedEdit): Promise<ErrorBody | null> {
	const household = guidedHousehold(edit)
	for (const dryRun of [true, false]) {
		const command = guidedHouseholdCommand(edit.name, household, dryRun)
		const run = await runTraj(context, command.argv, z.unknown(), command.stdin)
		if (!run.ok) return run.error
	}
	return null
}

/** Runs one guided plan: the template read, the document, the apply (which must create), the household, and the remove. */
export async function runGuidedEdit(context: RunContext, edit: GuidedEdit): Promise<EditRun> {
	const template = await runTraj(context, guidedTemplateRead(edit), z.string())
	if (!template.ok) return { ok: false, error: template.error }
	const built = guidedDocument(template.data, edit)
	if (!built.ok) return { ok: false, error: built.error }
	const apply = (dryRun: boolean) => {
		const command = guidedApplyCommand(edit.name, built.document, dryRun)
		return runTraj(context, command.argv, z.unknown(), command.stdin)
	}
	const dry = await apply(true)
	if (!dry.ok) return { ok: false, error: dry.error }
	// A new plan must be new: an apply under a taken name would replace that plan's document.
	if (!wasCreated(dry.data)) return { ok: false, error: nameTaken(edit.name) }
	const real = await apply(false)
	if (!real.ok) return { ok: false, error: real.error }
	const refused = await writeHousehold(context, edit)
	if (refused !== null) return removePlan(context, edit, refused)
	// A plan of the name made between the two writes (a window of milliseconds) is replaced: the write is done.
	return { ok: true, replaced: !wasCreated(real.data), ...droppedOf(real.data) }
}
