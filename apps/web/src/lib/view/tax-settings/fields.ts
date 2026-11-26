/**
 * The items of a tax profile the page shows and the form takes, in words a person reads
 * ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). A value is an
 * input the person states, never a figure: no allowance, limit or rate is named here, because `traj` holds them.
 */

import type { AmountKey, CountKey } from "../../edit/tax-flags"
import type { Choice } from "../plan-items/options"

/** One count or amount of the profile: its key, the label a person reads and what it counts. */
export interface TaxField {
	readonly key: CountKey | AmountKey
	readonly kind: "count" | "amount"
	readonly label: string
	readonly hint?: string
}

/** The counts of people, in the order the page lists them. */
export const COUNT_FIELDS: readonly TaxField[] = [
	{
		key: "children",
		kind: "count",
		label: "Children",
		hint: "Children counted for the child allowance",
	},
	{
		key: "childrenAtHigherRate",
		kind: "count",
		label: "Children born 2018 or later",
		hint: "Allowed at the higher rate; a part of the children above",
	},
	{
		key: "parents",
		kind: "count",
		label: "Parents you support",
		hint: "Aged 60 or over, within the statute's income limit",
	},
	{ key: "disabledCare", kind: "count", label: "Relatives with a disability you care for" },
]

/** The amounts paid in the tax year, in baht, in the order the page lists them. */
export const AMOUNT_FIELDS: readonly TaxField[] = [
	{ key: "socialSecurity", kind: "amount", label: "Social security paid" },
	{ key: "lifeInsurance", kind: "amount", label: "Life insurance premiums" },
	{ key: "healthInsurance", kind: "amount", label: "Your health insurance premiums" },
	{
		key: "parentHealthInsurance",
		kind: "amount",
		label: "Health insurance premiums for your parents",
	},
	{
		key: "spouseLifeInsurance",
		kind: "amount",
		label: "Life insurance premiums for a spouse with no income",
		hint: "Needs a filing status that allows the spouse allowance",
	},
	{ key: "mortgageInterest", kind: "amount", label: "Home-loan interest" },
	{
		key: "sharedMortgageInterest",
		kind: "amount",
		label: "Shared home-loan interest",
		hint: "Interest on one loan borrowed together; half in a year both have income, otherwise the Return with income claims it all",
	},
	{
		key: "donation2x",
		kind: "amount",
		label: "Donations the statute counts twice",
		hint: "Such as education and hospitals",
	},
	{ key: "donation1x", kind: "amount", label: "Donations counted once" },
]

/** The filing statuses `traj` takes, with the words a person reads. */
export const FILING_CHOICES: readonly Choice[] = [
	{ value: "single", label: "Single" },
	{ value: "married_no_income_spouse", label: "Married, spouse has no income" },
	{ value: "married_separate", label: "Married, filing separately" },
	{ value: "married_joint", label: "Married, filing jointly" },
	{
		value: "married_separate_40_1_joint_rest",
		label: "Married, salary filed separately and other income jointly",
	},
]

/** The label of a filing status; the status itself when it is none of the known ones. */
export function filingLabel(status: string): string {
	return FILING_CHOICES.find((choice) => choice.value === status)?.label ?? status
}
