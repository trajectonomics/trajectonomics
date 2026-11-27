import type { Anchor } from "./model"

/**
 * The way out a conflict names, built from the anchor and the plan names the caller knows (cli
 * ADR-0048). `apply` moves the stored plan's anchor; `fork` names both plans, because the copy does
 * not exist until the anchors pass.
 */

export type ConflictHint = (anchor: Anchor) => string

/** `apply`'s hint: the stored plan's own household moves the anchor. */
export function applyConflictHint(owner: string): ConflictHint {
	return () =>
		`Run "traj scenario household ${owner} --file <path>" to move the anchor, or remove the value so the anchor fills it.`
}

/** `fork`'s hint: name the source and the copy, then move the copy's anchor. */
export function forkConflictHint(from: string, name: string): ConflictHint {
	return () =>
		`Remove the --set so the household sets the date, or run "traj scenario fork ${from} ${name}" first, then "traj scenario household ${name} --file <path>" to move the anchor.`
}
