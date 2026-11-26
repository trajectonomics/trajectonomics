import type { ProjectionCompare } from "../../contract"

/** One side of a compare as the page names it: its letter, Scenario and line style. */
export interface CompareSideHeading {
	readonly letter: "A" | "B"
	readonly name: string
	readonly dashed: boolean
}

/** The two sides of a compare: A is drawn solid, B dashed, everywhere on the page. */
export function compareSides(
	data: ProjectionCompare,
): readonly [CompareSideHeading, CompareSideHeading] {
	const { a, b } = data.sides
	return [
		{ letter: "A", name: a.scenario.name, dashed: false },
		{ letter: "B", name: b.scenario.name, dashed: true },
	]
}
