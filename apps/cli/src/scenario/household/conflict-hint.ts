/**
 * The way out a conflict names, built from the plan names the caller knows and whether the document
 * requires the date (cli ADR-0048). `apply` moves the stored plan's anchor; `fork` names both plans,
 * because the copy does not exist until the anchors pass.
 */

/** Whether removing the value is refused, so the way out is writing the anchored date instead. */
export type ConflictHint = (required: boolean) => string

/** A name as a shell reads it back: bare when it is only `A-Za-z0-9._-`, else in single quotes. */
function quotedName(name: string): string {
	return /^[A-Za-z0-9._-]+$/.test(name) ? name : `'${name.replaceAll("'", "'\\''")}'`
}

/** `apply`'s hint: the stored plan's own household moves the anchor. */
export function applyConflictHint(owner: string): ConflictHint {
	return (required) =>
		`Run "traj scenario household ${quotedName(owner)} --file <path>" to move the anchor, or ${
			required ? "write the anchored date it names" : "remove the value so the anchor fills it"
		}.`
}

/** `fork`'s hint: name the source and the copy, then move the copy's anchor. */
export function forkConflictHint(from: string, name: string): ConflictHint {
	return () =>
		`Remove the --set so the household sets the date, or run "traj scenario fork ${quotedName(from)} ${quotedName(name)}" first, then "traj scenario household ${quotedName(name)} --file <path>" to move the anchor.`
}
