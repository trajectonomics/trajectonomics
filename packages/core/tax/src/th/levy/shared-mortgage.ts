import { TH_2026_PARAMETERS } from "../parameters"
import { ThAllowanceField } from "../types"
import { toSatang } from "../units"
import { TH_LEVY_READ_PREFIX, TH_LEVY_SHARED_FILER, thFilerLabel, validateThFilers } from "./filers"
import type { ThLevyGraph } from "./graph"
import { capAt, sumMeasures } from "./graph-rates"
import { ThLevyRounding } from "./graph-types"
import { TH_LEVY_INCOME_LABELS } from "./labels"
import type { ThLevyProfile, ThLevySharedMortgage } from "./profile-types"
import { addIncomeTallies, type ThLevyTallies } from "./tallies"

/**
 * The other Filer's assessable income this period, in satang: their own labels plus half of
 * `@shared`, the same view `addThLevyScope` gives that Filer under `married_separate`.
 *
 * Purpose: Tells a period in which the other spouse has income from one in which they have none.
 * Math: `sum(own[label] + floor(shared[label] / 2))` over the income labels.
 * Units: Integer satang Measure.
 * Throws: Nothing; the ids are unique and the labels are the exported ones.
 *
 * @param graph Measure graph being built.
 * @param other The other Filer's id.
 * @statute Thailand Revenue Code Section 57 sexies, paragraph 2.
 */
function incomeOf(graph: ThLevyGraph, other: string): string {
	const own = addIncomeTallies(graph, (label) => thFilerLabel(label, other))
	const shared = addIncomeTallies(graph, (label) => thFilerLabel(label, TH_LEVY_SHARED_FILER))
	const parts = TH_LEVY_INCOME_LABELS.map((label) => {
		const half = graph.scale(
			shared[label],
			1,
			2,
			ThLevyRounding.Floor,
			`${TH_LEVY_READ_PREFIX}other.half.${label}`,
		)
		return graph.add(own[label], half)
	})
	return sumMeasures(graph, parts)
}

/**
 * Emits one period's home-loan interest allowance for a Return that shares a loan.
 *
 * Purpose: Applies the s.47(1)(ซ) one-earner rule in every Settlement period: when both Filers have
 * income each claims its stated share, and when only one does that Filer claims the whole loan,
 * capped with their own interest. A Filer with no income claims nothing.
 * Math: `this > 0 ? (other > 0 ? min(own + share, ceiling) : min(own + total, ceiling)) : 0`, where
 * `this` and `other` are the Filer's gross income labels plus half of `@shared`, and `share` is
 * `allowances.mortgageInterest` minus this Return's own interest.
 * Units: THB major units in, integer satang Measures out.
 * Throws: TaxValidationError for an invalid other Filer id or a negative or unsafe amount.
 *
 * @param graph Measure graph being built.
 * @param profile The Return's profile; `allowances.mortgageInterest` is its both-earners claim.
 * @param tallies This Return's view this period, with its own income and half of `@shared`.
 * @param shared The shared loan's other Filer, this Return's own interest and the whole interest.
 * @statute Thailand Revenue Code Section 47(1)(ซ).
 */
export function addSharedMortgageAllowance(
	graph: ThLevyGraph,
	profile: ThLevyProfile,
	tallies: ThLevyTallies,
	shared: ThLevySharedMortgage,
): string {
	validateThFilers([shared.other], "married_separate")
	const field = ThAllowanceField.MortgageInterest
	const own = toSatang(shared.own, field)
	const together = own + toSatang(shared.total, field)
	const ceiling = toSatang(TH_2026_PARAMETERS.allowances.mortgageInterestCeiling, field)
	const both = capAt(
		graph,
		graph.constant(toSatang(profile.allowances?.mortgageInterest ?? 0, field)),
		ceiling,
	)
	const alone = capAt(graph, graph.constant(together), ceiling)
	const zero = graph.constant(0)
	const mine = sumMeasures(
		graph,
		TH_LEVY_INCOME_LABELS.map((label) => tallies.income[label]),
	)
	const chosen = graph.pick(incomeOf(graph, shared.other), zero, both, alone)
	return graph.pick(mine, zero, chosen, zero)
}
