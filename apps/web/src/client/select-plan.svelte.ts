import { setQueryParam } from "./query-param.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/**
 * The one way the page changes the plan it shows. A What-if session belongs to one plan, so while it holds
 * changes a switch to another plan asks first ("Revert and switch", or stay) instead of running. Every
 * route and the plan switcher call this, never `setQueryParam("scenario", …)`: `select-plan.test.ts` fails
 * when a file under `src/` does.
 */
export function selectPlan(name: string): Promise<void> {
	if (!whatIfSession.requestSwitch(name)) return Promise.resolve()
	return setQueryParam("scenario", name)
}
