import type { Cell } from "../compare/cell"
import type { ChangeView } from "./change"

/**
 * One figure on a figure page while a What-if session is open: the what-if value (the main figure), the
 * baseline it replaces (secondary) and the change the CLI stated between them.
 */
export interface Triple {
	readonly key: string
	readonly label: string
	readonly whatIf: Cell
	readonly baseline: Cell
	readonly change: ChangeView
}
