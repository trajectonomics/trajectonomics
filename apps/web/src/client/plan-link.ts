import { selectPlan } from "./select-plan.svelte.js"

/** What a plan link reads of a click: a modified one opens the link in a new tab or window, not a plan switch. */
type LinkClick = Pick<MouseEvent, "button" | "ctrlKey" | "metaKey" | "shiftKey" | "preventDefault">

/**
 * Follows a link that names a plan: the page switches to that plan before the link moves on, so every
 * plan change goes through `selectPlan` (web ADR 0010). A modified click (Ctrl, Cmd, Shift or the middle
 * button) is the browser's, so it opens the link elsewhere and this page keeps its plan. A switch the
 * What-if session refuses, because it holds changes, stops the navigation instead, so the person answers
 * the question on the page they were reading.
 */
export function followPlanLink(event: LinkClick, plan: string): void {
	if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return
	if (!selectPlan(plan)) event.preventDefault()
}
