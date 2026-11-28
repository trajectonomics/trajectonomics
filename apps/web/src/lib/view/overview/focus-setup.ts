/**
 * The focus point's one primary action. It is a module of its own so the hosted build can swap it
 * (web ADR 0028): the loopback Dashboard opens its Plans page, and the hosted Demo points at the
 * install, the same target the demo notice's "Get traj" uses.
 */
export interface FocusButton {
	readonly label: string
	readonly href: string
	/** True for a page outside this app, which takes no query string. */
	readonly external: boolean
}

/** Which setup the page is in: no plan at all, or a plan its reads cannot answer from yet. */
export type SetupAction = "first" | "plan"

/** This app's setup action: the guided page with no plan, else a new plan, on the Plans page. */
export function setupButton(action: SetupAction = "plan"): FocusButton {
	if (action === "first") {
		return { label: "Set up a first plan", href: "/plans/new/", external: false }
	}
	return { label: "Start a plan", href: "/plans/", external: false }
}
