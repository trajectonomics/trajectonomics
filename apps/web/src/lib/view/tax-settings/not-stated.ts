/**
 * The classes `scenario tax` reports in `notStated` for a stored profile and its plan, each with the group that states it
 * ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). Pure.
 */
import type { ScenarioDocument, TaxProfile } from "../../contract"
import { ALLOWANCE_LABELS } from "../../contract/allowance-labels"
import { AMOUNT_FIELDS, COUNT_FIELDS } from "./fields"
import { type GroupKey, PLACE, TAX_CLASSES, type TaxClass } from "./groups"

/** One class the plan does not state: what a person reads, and where it is stated. */
export interface NotStated {
	readonly class: TaxClass
	readonly label: string
	readonly place: GroupKey | "flows"
}

const THAI_ESG = "allowance.thai_esg"

/** The classes the contribution Flows of the plan carry: a label the Levy reads, other than ThaiESG, is a retirement one. */
function carried(plan: ScenarioDocument): { retirement: boolean; esg: boolean } {
	const labels = plan.flows.filter((flow) => flow.kind === "contribution").map((flow) => flow.label)
	const known = [...ALLOWANCE_LABELS.map((entry) => entry.label), "allowance.retirement.ssf"]
	return {
		retirement: labels.some(
			(label) => label !== undefined && label !== THAI_ESG && known.includes(label),
		),
		esg: labels.includes(THAI_ESG),
	}
}

/** What the class is called: the item's own words, or the two the Levy reads from contributions. */
function nameOf(klass: TaxClass): string {
	if (klass === "retirementContributions") return "Retirement fund contributions"
	if (klass === "thaiEsg") return "ThaiESG contributions"
	return [...COUNT_FIELDS, ...AMOUNT_FIELDS].find((field) => field.key === klass)?.label ?? klass
}

/**
 * The classes `scenario tax` reports in `notStated` for a stored profile and its plan: a count or an amount of zero or none
 * states nothing, and a retirement class is stated by a contribution Flow that carries a label the Levy reads. The page asks
 * `traj` for none of it, so `scripts/tax-cards.test.ts` pins this against the real answer.
 */
export function notStated(profile: TaxProfile, plan: ScenarioDocument): NotStated[] {
	const given = profile as Record<string, unknown>
	const flows = carried(plan)
	const stated = (klass: TaxClass): boolean => {
		if (klass === "retirementContributions") return flows.retirement
		if (klass === "thaiEsg") return flows.esg
		const value = given[klass]
		return typeof value === "number" && value > 0
	}
	return TAX_CLASSES.filter((klass) => !stated(klass)).map((klass) => ({
		class: klass,
		label: nameOf(klass),
		place: PLACE[klass],
	}))
}
