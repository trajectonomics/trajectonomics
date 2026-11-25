/**
 * The household anchors the last plan write dropped, as the CLI named them (cli ADR-0048): the page shows them
 * until the person dismisses the notice or the next Edit runs.
 */
export const dropped = $state<{ anchors: readonly string[] }>({ anchors: [] })

/** Hides the notice of the anchors the last write dropped. */
export function dismissDropped(): void {
	dropped.anchors = []
}
