import type { Cell } from "../compare/cell"
import type { ItemLabel } from "../item-names"
import type { ChangeView } from "./change"

/**
 * One figure on a figure page while a What-if session is open: the what-if value (the main figure), the
 * baseline it replaces (secondary) and the change the CLI stated between them.
 */
export interface Triple {
	readonly key: string
	readonly label: string
	/** The item the label names, when a Milestone's id shows in code if the plan states no name. */
	readonly labelItem?: ItemLabel | undefined
	readonly whatIf: Cell
	readonly baseline: Cell
	readonly change: ChangeView
}
