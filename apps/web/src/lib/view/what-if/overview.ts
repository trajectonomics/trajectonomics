import type { ProjectionChance, ProjectionRun } from "../../contract"
import type { WhatIfLens } from "../../what-if/lens"
import { moneyCell, textCell } from "../compare/cell"
import { feesOverPlan } from "../lifetime"
import { type ChanceTriple, chanceTriple } from "./chance"
import { taxYearTriples } from "./tax"
import type { Triple } from "./triple"

/** The figures the Overview's what-if adds to the headline set: the chance of success, the first tax year and the fees over the plan. */
export interface OverviewExtras {
	readonly chance: ChanceTriple | null
	/** The first tax year's owed amount, named by its Levy and period; null when the plan has no Levy. */
	readonly tax: Triple | null
	/** The fees over the plan as the what-if's run states them beside the baseline's; null when the what-if's run states none above zero. */
	readonly fees: Triple | null
}

/** The reason a lifetime fee has no change: `projection compare` states none for it. */
const NO_FEES_CHANGE = "The CLI states no change for the fees over the plan"

/** The fees over the plan of the what-if's run beside the baseline's, each as `projection run` states it; no change is shown. */
function feesTriple(lens: WhatIfLens, baseline: ProjectionRun | null): Triple | null {
	const tried = feesOverPlan(lens.run)
	const was = feesOverPlan(baseline)
	if (tried === null && was === null) return null
	return {
		key: "lifetimeFees",
		label: "Fees over the plan",
		whatIf: tried === null ? textCell("None") : moneyCell(tried.amount),
		baseline: was === null ? textCell("None") : moneyCell(was.amount),
		change: { kind: "none", reason: NO_FEES_CHANGE },
	}
}

/** The chance beside the baseline's, and the first tax year's owed amount, from the lens's own reads. */
export function overviewExtras(
	lens: WhatIfLens,
	baseline: ProjectionChance | null,
	baselineRun: ProjectionRun | null = null,
): OverviewExtras {
	const first = lens.compare === null ? undefined : taxYearTriples(lens.compare)[0]
	const owed = first?.figures.find((figure) => figure.key === "owed")
	return {
		chance: lens.chance === null ? null : chanceTriple(lens.chance, baseline),
		tax:
			first === undefined || owed === undefined
				? null
				: { ...owed, label: `Tax owed for ${first.period}, Levy ${first.levy}` },
		fees: feesTriple(lens, baselineRun),
	}
}
