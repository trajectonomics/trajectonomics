/** One row of the plan switcher: the plan's name, whether the pages show it, and choosing it. */
export interface PlanChoice {
	readonly name: string
	readonly selected: boolean
	/** Asks the page to show this plan; the row's button runs it. */
	readonly choose: () => unknown
}

/**
 * The plan switcher's rows in the Snapshot's order, the main plan first: choosing a row asks the page
 * to show that plan, whose answer says whether it did.
 */
export function planChoices(
	names: readonly string[],
	selected: string,
	onChange: (name: string) => unknown,
): readonly PlanChoice[] {
	return names.map((name) => ({
		name,
		selected: name === selected,
		choose: () => onChange(name),
	}))
}
