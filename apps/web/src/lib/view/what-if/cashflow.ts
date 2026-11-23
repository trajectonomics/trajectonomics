import type { ProjectionRun } from "../../contract"
import { rollupsOf, sectionsOf } from "../cashflow/cashflow"
import { moneyCell, textCell } from "../compare/cell"
import type { Triple } from "./triple"

/** The reason a section has no change: `projection compare` states none for the cash-flow totals. */
const NO_CASHFLOW_CHANGE = "The CLI states no change for a cash-flow total"

/** The section totals of one roll-up, by the total's name, as the CLI states them. Empty when the run has none. */
function totalsOf(run: ProjectionRun | null, index: number): ReadonlyMap<string, string | null> {
	const rollup = run === null ? undefined : rollupsOf(run).find((entry) => entry.index === index)
	if (rollup === undefined) return new Map()
	return new Map(sectionsOf(rollup).map((section) => [section.total, section.amount]))
}

/**
 * The section totals of one year of the what-if beside the same year of the baseline, each the CLI's
 * `cashflowTotals` row (`projection run --breakdown`). The CLI states no change between them, so none is
 * shown. A section the what-if run does not state is left out.
 */
export function cashflowTriples(
	whatIf: ProjectionRun,
	baseline: ProjectionRun | null,
	index: number,
): readonly Triple[] {
	const before = totalsOf(baseline, index)
	return [...totalsOf(whatIf, index)].flatMap(([total, amount]) => {
		if (amount === null) return []
		const was = before.get(total) ?? null
		return [
			{
				key: total,
				label: total,
				whatIf: moneyCell(amount),
				baseline: was === null ? textCell("No such year") : moneyCell(was),
				change: { kind: "none", reason: NO_CASHFLOW_CHANGE },
			} satisfies Triple,
		]
	})
}
