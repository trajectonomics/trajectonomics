/** The `traj` write each plan-managing Edit runs, and the read behind a new plan's template. Pure. */
import type { WriteCommand } from "./command"
import type { Edit } from "./edit"

/** The Edits that manage plans: rename, notes and the main plan. */
export type PlanEdit = Extract<Edit, { kind: "rename-plan" | "set-plan-notes" | "set-main-plan" }>

/** An `apply-plan` that starts a plan from the ledger's accounts, rather than saving a document. */
export type StartPlan = Extract<Edit, { template: unknown }>

/** The read of the template a new plan starts from: the ledger's accounts declared at the As-of (cli ADR 0044). */
export function templateRead(asOf: string): string[] {
	return ["scenario", "apply", "--template", "--as-of", asOf, "--json"]
}

/** The write of a new plan: the template, as the CLI printed it, applied under the name. */
export function startCommand(edit: StartPlan, template: string, flags: string[]): WriteCommand {
	// The template prints minor units, so it is applied without --decimal.
	return { argv: ["scenario", "apply", edit.name, "--file", "-", ...flags], stdin: template }
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
