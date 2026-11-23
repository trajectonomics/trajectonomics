/**
 * What the planner's item drawer is open on: an item to edit (or none, for a new one), in which form, and
 * whether it tries a value in the What-if session instead of saving one.
 */
export interface PlanDrawer {
	/** The item's id: a Flow's or an Account's, or a loan's liability Account. Absent for a new item. */
	readonly id?: string
	/** True when the drawer tries a value in the What-if session. */
	readonly tryValue?: boolean
	/** True when the drawer edits a loan (its Account, its payments and its withdrawal) rather than an Account. */
	readonly loan?: boolean
	/** True when the drawer pays a loan extra, by the id of the loan. */
	readonly extra?: boolean
}

/** The drawer's heading: what it does to which item, in the noun of its page. */
export function drawerTitle(drawer: PlanDrawer, noun: string): string {
	if (drawer.extra === true) return `Pay extra on ${drawer.id ?? ""}`
	if (drawer.loan === true) {
		if (drawer.id === undefined) return "Add loan"
		return drawer.tryValue === true ? `Try a value for loan ${drawer.id}` : `Edit loan ${drawer.id}`
	}
	if (drawer.id === undefined) return `Add ${noun}`
	return drawer.tryValue === true ? `Try a value for ${drawer.id}` : `Edit ${drawer.id}`
}
