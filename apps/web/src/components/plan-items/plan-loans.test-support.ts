import { render } from "svelte/server"
import type { ProjectionRun, ScenarioDocument } from "../../lib/contract"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
import PlanItemsList from "./PlanItemsList.svelte"

export const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

/** The loan's statement as `traj projection run --liabilities` states it: two months, then paid off. */
export function runWithLoan(): ProjectionRun {
	const month = (from: string, to: string, paid: string, closing: string) => ({
		account: "loan",
		from,
		to,
		opening: "500000.00",
		drawn: "0.00",
		paid,
		interest: "2083.33",
		closing,
		partial: false,
	})
	return projectionRunFixture({
		tables: [
			{
				name: "liabilities",
				count: 2,
				rows: [
					month("2027-02-01", "2027-02-28", "10000.00", "492083.33"),
					month("2027-03-01", "2027-03-31", "10000.00", "484166.66"),
				],
			},
			{ name: "paidOff", count: 1, rows: [{ account: "loan", date: "2032-01-31" }] },
		],
	})
}

export function assets(
	options: { doc?: ScenarioDocument; editable?: boolean; run?: ProjectionRun } = {},
): string {
	return render(PlanItemsList, {
		props: {
			kind: "assets",
			name: "base",
			doc: options.doc ?? loanPlanDocument(),
			household: null,
			baseline: baselineRead(),
			run: options.run,
			editable: options.editable ?? true,
			contentHash: HASH,
		},
	}).body
}
