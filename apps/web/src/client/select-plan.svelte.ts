import { dismissDropped } from "./dropped-anchors.svelte.js"
import { setQueryParam } from "./query-param.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/**
 * The one way the page changes the plan it shows. A What-if session belongs to one plan, so while it holds
 * changes a switch to another plan asks first ("Revert and switch", or stay) instead of running. Every
 * route and the plan switcher call this, never `setQueryParam("scenario", …)`: `what-if.svelte.test.ts`
 * fails when a file under `src/` does. Returns false when the switch was refused, so the control that asked
 * can show the plan the page still shows.
 */
export function selectPlan(name: string): boolean {
	if (!whatIfSession.requestSwitch(name)) return false
	dismissDropped()
	void setQueryParam("scenario", name)
	return true
}
