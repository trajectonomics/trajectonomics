/**
 * What the last plan write did beside the change, as the CLI stated it: the household anchors and Owners it dropped
 * (cli ADR-0048, ADR-0076), whether it replaced a plan of its name made while it ran, and the plan it changed. The
 * page shows them until the person dismisses the notice, the next Edit runs or another plan is shown.
 */
export const dropped = $state<{
	plan: string | null
	anchors: readonly string[]
	owners: readonly string[]
	replaced: boolean
}>({
	plan: null,
	anchors: [],
	owners: [],
	replaced: false,
})

/** What an Edit's answer stated beside the change: what it dropped, and whether it replaced a plan made while it ran. */
export type WriteNotes = {
	droppedAnchors?: readonly string[] | undefined
	droppedOwners?: readonly string[] | undefined
	replaced?: boolean | undefined
}

/** Shows the notice of what a write to `plan` did beside the change. */
export function showDropped(plan: string | null, notes: WriteNotes): void {
	dropped.plan = plan
	dropped.anchors = notes.droppedAnchors ?? []
	dropped.owners = notes.droppedOwners ?? []
	dropped.replaced = notes.replaced === true
}

/** Hides the notice of what the last write did. */
export function dismissDropped(): void {
	dropped.plan = null
	dropped.anchors = []
	dropped.owners = []
	dropped.replaced = false
}
