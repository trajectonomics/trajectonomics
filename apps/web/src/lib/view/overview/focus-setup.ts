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

/** This app's setup action: a new plan, on the Plans page. */
export function setupButton(): FocusButton {
	return { label: "Start a plan", href: "/plans/", external: false }
}
