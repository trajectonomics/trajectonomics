import type { FocusButton } from "./focus-setup"

export type { FocusButton } from "./focus-setup"

/** The four states the focus point opens on, in the order they are tried. */
export type FocusKind = "setup" | "runsOut" | "reachable" | "unreachable"

/** One person the answer is about, named by the same lookup the FI page uses (ADR 0029). */
export interface FocusFace {
	readonly name: string
	readonly initial: string
	readonly age: number
	readonly role: "holder" | "partner"
}

/** The chance read's counts, for the grid of markets the answer drew. */
export interface FocusCounts {
	readonly succeeded: number
	readonly paths: number
}

/** Everything the focus point renders: the answer, the heading it labels the section with, and its one button. */
export interface FocusView {
	readonly kind: FocusKind
	/** The words written on the chart. */
	readonly answer: string
	/** The whole answer, read at the top of the focus point and hidden on screen. */
	readonly sentence: string
	readonly button: FocusButton
	/** The plan the answer belongs to, for the link to its FI page; null when no plan answers. */
	readonly plan: string | null
	/** The date the stop point sits at, or null when the chart has no stop point. */
	readonly stopDate: string | null
	/** The plan's last year, read as text, for the flag or the bar. */
	readonly horizonYear: string | null
	/** The CLI's shortfall, for the bar under zero, or null. */
	readonly unmet: string | null
	readonly currency: string | null
	readonly faces: readonly FocusFace[]
	readonly counts: FocusCounts | null
}

/** Case 3 and 4's one action: the Plan page. */
export const SEE_PLAN: FocusButton = {
	label: "See your plan",
	href: "/projection/",
	external: false,
}

/** Case 2's action: the Plan page, where the run-out is charted. */
export const SEE_RUNS_OUT: FocusButton = {
	label: "See where it runs out",
	href: "/projection/",
	external: false,
}
