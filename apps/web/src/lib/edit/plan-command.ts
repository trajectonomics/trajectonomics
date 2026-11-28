/** The `traj` write each plan-managing Edit runs, and a new plan's. Pure. */
import type { WriteCommand } from "./command"
import type { Edit } from "./edit"

/** The Edits that manage plans: rename, notes and the main plan. */
export type PlanEdit = Extract<Edit, { kind: "rename-plan" | "set-plan-notes" | "set-main-plan" }>

/** An `apply-plan` that starts a plan from the ledger's accounts, rather than saving a document. */
export type StartPlan = Extract<Edit, { template: unknown }>

/**
 * The write of a new plan: `traj` fills the template at the As-of and saves it under a free name in one step, so the
 * plan records which values `traj` wrote, and a taken name is refused (cli ADR 0084).
 */
export function startCommand(edit: StartPlan, flags: string[]): WriteCommand {
	return {
		argv: ["scenario", "apply", edit.name, "--template", "--as-of", edit.template.asOf, ...flags],
	}
}

/** The write of a rename, a notes change or a main-plan change. */
export function planCommand(edit: PlanEdit, flags: string[]): WriteCommand {
	switch (edit.kind) {
		case "rename-plan":
			return {
				argv: [
					"scenario",
					"rename",
					edit.name,
					edit.newName,
					"--if-hash",
					edit.contentHash,
					...flags,
				],
			}
		case "set-plan-notes":
			// The notes go on stdin, so no text is ever read as a flag; empty notes take the notes off.
			return edit.notes === ""
				? { argv: ["scenario", "notes", edit.name, "--clear", ...flags] }
				: { argv: ["scenario", "notes", edit.name, "--file", "-", ...flags], stdin: edit.notes }
		case "set-main-plan":
			return { argv: ["scenario", "main", edit.name, ...flags] }
	}
}
