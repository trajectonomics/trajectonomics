import type { ProjectionCompare } from "../../contract"
import { shortHash } from "./hash"

/** One side of a compare as the page names it: its letter, Scenario, shortened hash and line style. */
export interface CompareSideHeading {
	readonly letter: "A" | "B"
	readonly name: string
	readonly hash: string
	readonly dashed: boolean
}

/** The two sides of a compare: A is drawn solid, B dashed, everywhere on the page. */
export function compareSides(
	data: ProjectionCompare,
): readonly [CompareSideHeading, CompareSideHeading] {
	const { a, b } = data.sides
	return [
		{ letter: "A", name: a.scenario.name, hash: shortHash(a.scenario.contentHash), dashed: false },
		{ letter: "B", name: b.scenario.name, hash: shortHash(b.scenario.contentHash), dashed: true },
	]
}
