import { render } from "svelte/server"
import type { ProjectionAllowances, ProjectionRun, Read, TaxYear } from "../../lib/contract"
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

/** One allowances tax year: the CLI's figures, with the saving a separate filing states for its Return. */
export function allowanceYear(over: Partial<ProjectionAllowances["taxYears"][number]> = {}) {
	return {
		levy: "th-2026-pit",
		from: "2026-01-01",
		to: "2026-12-31",
		settlementDate: "2027-03-31",
		dueBefore: "89000.00",
		dueAfter: "89000.00",
		saving: "0.00",
		assumptions: [],
		...over,
	}
}

export function panel(
	projections: Readonly<Record<string, Read<ProjectionRun>>>,
	requested = "",
	people: Readonly<Record<string, PersonNames>> = {},
	holders: Readonly<Record<string, string | null>> = {},
	allowances: Readonly<Record<string, Read<ProjectionAllowances>>> = {},
	returned = "",
	plans: readonly string[] = Object.keys(projections),
): string {
	return render(TaxPanel, {
		props: {
			names: plans,
			projections,
			allowances,
			people,
			holders,
			requested,
			onScenario: () => {},
			returned,
			onReturn: () => {},
		},
	}).body
}

export const withLevy = projectionRun({ taxYears: [year()] })
