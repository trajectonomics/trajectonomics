import type { ProjectionRun } from "../../lib/contract"
import type { ItemNames } from "../../lib/view/item-names"

/** What the Projection page's charts need besides the chart they draw: the chart the address names, and every plan's run. */
export interface ChartsContext {
	/** The id of the custom chart the address bar names, or "" for the net worth chart. */
	readonly chart: string
	readonly onChart: (id: string) => void
	/** Every plan's run in the Snapshot, so the picker lists what any plan states and greys out what this one lacks. */
	readonly runs: readonly ProjectionRun[]
	/** The names of the plan the page shows: its Accounts, people and the labels its document states. */
	readonly names: ItemNames
}
