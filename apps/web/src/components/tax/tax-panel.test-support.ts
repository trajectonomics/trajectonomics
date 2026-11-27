import { render } from "svelte/server"
import type { ProjectionRun, Read, TaxYear } from "../../lib/contract"
import { projectionRun } from "../../lib/view/compare/projection.test-support"
import type { PersonNames } from "../../lib/view/item-names"
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
		assumptions: [],
		...over,
	}
}

export function panel(
	projections: Readonly<Record<string, Read<ProjectionRun>>>,
	requested = "",
	people: Readonly<Record<string, PersonNames>> = {},
	holders: Readonly<Record<string, string | null>> = {},
): string {
	return render(TaxPanel, {
		props: {
			names: Object.keys(projections),
			projections,
			people,
			holders,
			requested,
			onScenario: () => {},
		},
	}).body
}

export const withLevy = projectionRun({ taxYears: [year()] })
