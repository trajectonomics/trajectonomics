/**
 * The classes `scenario show` reports as `taxAllowances.notStated` for a taxed plan, each with the group that states it
 * ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). The page works
 * out none of it: `traj` says which classes the plan leaves out, and this names each one and says where it is stated. Pure.
 */
import type { TaxAllowances } from "../../contract"
import { AMOUNT_FIELDS, COUNT_FIELDS } from "./fields"
import { type GroupKey, PLACE, type TaxClass } from "./groups"

/** One class the plan does not state: what a person reads, and where it is stated. */
export interface NotStated {
	readonly class: string
	readonly label: string
	/** The group of the drawer that states it, `flows` for a class a contribution Flow states, and `null` for a class this page has no place for yet. */
	readonly place: GroupKey | "flows" | null
}

/** What the class is called: the item's own words, or the two the Levy reads from contributions. */
function nameOf(klass: string): string {
	if (klass === "retirementContributions") return "Retirement fund contributions"
	if (klass === "thaiEsg") return "ThaiESG contributions"
	return [...COUNT_FIELDS, ...AMOUNT_FIELDS].find((field) => field.key === klass)?.label ?? klass
}

/** The place of a class, or `null` for one a later `traj` reports that `PLACE` does not list. */
function placeOf(klass: string): GroupKey | "flows" | null {
	return Object.hasOwn(PLACE, klass) ? PLACE[klass as TaxClass] : null
}

/**
 * The classes `traj scenario show` says the plan does not state, in its order. A plan with no `taxAllowances` (an untaxed plan,
 * a Levy with no stored profile, or a Snapshot from an earlier build) lists none: the page does not guess.
 */
export function notStated(allowances: TaxAllowances | undefined): NotStated[] {
	return (allowances?.notStated ?? []).map((klass) => ({
		class: klass,
		label: nameOf(klass),
		place: placeOf(klass),
	}))
}
