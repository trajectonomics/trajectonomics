import type { ProjectionChance } from "../../contract"
import type { WhatIfLens } from "../../what-if/lens"
import { type ChanceTriple, chanceTriple } from "./chance"
import { taxYearTriples } from "./tax"
import type { Triple } from "./triple"

/** The figures the Overview's what-if adds to the headline set: the chance of success and the first tax year. */
export interface OverviewExtras {
	readonly chance: ChanceTriple | null
	/** The first tax year's owed amount, named by its Levy and period; null when the plan has no Levy. */
	readonly tax: Triple | null
}

/** The chance beside the baseline's, and the first tax year's owed amount, from the lens's own reads. */
export function overviewExtras(
	lens: WhatIfLens,
	baseline: ProjectionChance | null,
): OverviewExtras {
	const first = lens.compare === null ? undefined : taxYearTriples(lens.compare)[0]
	const owed = first?.figures.find((figure) => figure.key === "owed")
	return {
		chance: lens.chance === null ? null : chanceTriple(lens.chance, baseline),
		tax:
			first === undefined || owed === undefined
				? null
				: { ...owed, label: `Tax owed for ${first.period}, Levy ${first.levy}` },
	}
}
