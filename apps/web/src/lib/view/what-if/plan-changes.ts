import type { Addition } from "../../what-if/additions"
import type { SetChange } from "../../what-if/overrides"
import type { MarkMap } from "./items"

/** The session's changes to one plan, or null when no session is open on it. */
export type PlanChanges = {
	readonly sets: readonly SetChange[]
	readonly removals: readonly string[]
	/** The session's Additions; absent for a view that only reads Sets and Removals. */
	readonly additions?: readonly Addition[]
}

/** The cards of one planner page and what the session changes in each, by item id. */
export interface ItemsView<T> {
	readonly cards: readonly T[]
	readonly marks: MarkMap
}
