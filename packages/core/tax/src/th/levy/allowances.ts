import { addDonationAllowances } from "./allowances-donations"
import { addFilerRetirementAllowances } from "./allowances-filers"
import { addFixedAllowances } from "./allowances-fixed"
import type { ThLevyFilerReads } from "./filer-reads"
import type { ThLevyGraph } from "./graph"
import { sumMeasures } from "./graph-rates"
import { ThLevyMeasureId } from "./measure-ids"
import type { ThLevyProfile } from "./profile-types"
import { addSharedMortgageAllowance } from "./shared-mortgage"
import type { ThLevyTallies } from "./tallies"

/**
 * Allowance total and the net taxable income left for the bracket schedule.
 *
 * Purpose: Names the two audited outputs of the allowance pipeline.
 * Math: No arithmetic; ids only.
 * Units: The referenced Measures are integer satang.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 47.
 */
export interface ThAllowanceMeasures {
	/** Fixed (or its per-period mortgage Measure) + Retirement Cluster + ThaiESG + donations. */
	readonly total: string
	/** Net taxable income in satang, never below zero. */
	readonly netTaxable: string
}

/**
 * Emits every Section 47 allowance and derives net taxable income.
 *
 * Purpose: Orders the fixed, retirement, ThaiESG, and donation rules into one pipeline. A shared
 * home loan's interest is one per-period Measure instead of part of the fixed const.
 * Math: `netBefore = max(0, assessable - expenses - fixed - cluster - ThaiESG)`, then donations
 * are capped against that net; `netTaxable = max(0, netBefore - allowed donations)`.
 * Units: Integer satang Measures.
 * Throws: TaxValidationError for an invalid profile allowance, shared loan or donation amount.
 *
 * @param graph Measure graph being built.
 * @param tallies Income and contribution tally ids.
 * @param profile Emit-time filing status and allowances.
 * @param assessable Assessable income Measure used as the percentage base.
 * @param expenses Total expense deduction Measure.
 * @param filers Each Filer's tallies and assessable income, for the retirement caps; omitted reads
 * the Return as one Filer.
 * @statute Thailand Revenue Code Section 47.
 */
export function addAllowanceMeasures(
	graph: ThLevyGraph,
	tallies: ThLevyTallies,
	profile: ThLevyProfile,
	assessable: string,
	expenses: string,
	filers: readonly ThLevyFilerReads[] = [{ tallies, assessable }],
): ThAllowanceMeasures {
	const shared = profile.sharedMortgage
	const fixed = addFixedAllowances(graph, profile.allowances, profile.filingStatus ?? "single", {
		mortgageInterest: shared === undefined,
	})
	const mortgage =
		shared === undefined ? [] : [addSharedMortgageAllowance(graph, profile, tallies, shared)]
	const retirement = addFilerRetirementAllowances(graph, filers)
	const nonDonation = sumMeasures(graph, [
		fixed,
		...mortgage,
		retirement.cluster,
		retirement.thaiEsg,
	])
	const netBefore = graph.max(
		graph.sub(graph.sub(assessable, expenses), nonDonation),
		graph.constant(0),
	)
	const donations = addDonationAllowances(
		graph,
		netBefore,
		profile.allowances?.donation2x,
		profile.allowances?.donation1x,
	)
	const total = graph.add(nonDonation, donations.total, ThLevyMeasureId.AllowancesTotal)
	return { total, netTaxable: donations.netTaxable }
}
