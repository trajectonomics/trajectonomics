/**
 * The household anchors the last plan write dropped, as the CLI named them (cli ADR-0048), and the plan that write
 * changed: the page shows them until the person dismisses the notice, the next Edit runs or another plan is shown.
 */
export const dropped = $state<{ plan: string | null; anchors: readonly string[] }>({
	plan: null,
	anchors: [],
})

/** Shows the notice of the anchors a write to `plan` dropped. */
export function showDropped(plan: string | null, anchors: readonly string[]): void {
	dropped.plan = plan
	dropped.anchors = anchors
}

/** Hides the notice of the anchors the last write dropped. */
export function dismissDropped(): void {
	dropped.plan = null
	dropped.anchors = []
}
