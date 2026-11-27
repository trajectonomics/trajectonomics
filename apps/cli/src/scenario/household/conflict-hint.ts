import { printedCommand } from "../hint-command"

/**
 * The way out a conflict names, built from the plan names the caller knows and whether the document
 * requires the date (cli ADR-0048). `apply` moves the stored plan's anchor; `fork` names both plans,
 * because the copy does not exist until the anchors pass.
 */

/** Whether removing the value is refused, so the way out is writing the anchored date instead. */
export type ConflictHint = (required: boolean) => string

/** `apply`'s hint: the stored plan's own household moves the anchor. */
export function applyConflictHint(owner: string): ConflictHint {
	const household = printedCommand("traj scenario household", [owner], ["--file", "<path>"])
	return (required) =>
		`Run "${household}" to move the anchor, or ${
			required ? "write the anchored date it names" : "remove the value so the anchor fills it"
		}.`
}

/** `fork`'s hint: name the source and the copy, then move the copy's anchor. */
export function forkConflictHint(from: string, name: string): ConflictHint {
	const fork = printedCommand("traj scenario fork", [from, name])
	const household = printedCommand("traj scenario household", [name], ["--file", "<path>"])
	return () =>
		`Remove the --set so the household sets the date, or run "${fork}" first, then "${household}" to move the anchor.`
}
