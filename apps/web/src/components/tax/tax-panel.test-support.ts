import { render } from "svelte/server"
import type { ProjectionRun, Read, TaxYear } from "../../lib/contract"
import { projectionRun } from "../../lib/view/compare/projection.test-support"
import TaxPanel from "./TaxPanel.svelte"

export function year(over: Partial<TaxYear> = {}): TaxYear {
	return {
		levy: "th-2026-pit",
		from: "2026-01-01",
		to: "2026-12-31",
		settlementDate: "2027-03-31",
		due: "89000.00",
		prepaid: "0.00",
		owed: "89000.00",
		settled: true,
		partial: false,
		...over,
	}
}

export function panel(
	projections: Readonly<Record<string, Read<ProjectionRun>>>,
	requested = "",
): string {
	return render(TaxPanel, {
		props: { projections, requested, onScenario: () => {} },
	}).body
}

export const withLevy = projectionRun({ taxYears: [year()] })
