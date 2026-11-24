/**
 * The stored tax profile in groups, and what the plan does not state yet ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 * `TAX_CLASSES` is `traj`'s own list of deduction classes (`scenario tax`'s `allowances`), in its order, and `PLACE` puts each in
 * a group: a new class fails the typecheck here and `scripts/tax-cards.test.ts`, which reads the list from the binary. Pure.
 */
import type { TaxProfile } from "../../contract"
import { type ProfileRow, profileRows } from "./rows"

/** The deduction classes `scenario tax` states or leaves out, in the CLI's order. */
export const TAX_CLASSES = [
	"children",
	"parents",
	"disabledCare",
	"socialSecurity",
	"lifeInsurance",
	"healthInsurance",
	"parentHealthInsurance",
	"spouseLifeInsurance",
	"mortgageInterest",
	"donation2x",
	"donation1x",
	"retirementContributions",
	"thaiEsg",
] as const

/** A deduction class of `scenario tax`. */
export type TaxClass = (typeof TAX_CLASSES)[number]

/** A group of the stored request: one card, and the items its Edit opens. */
export type GroupKey = "filing" | "family" | "insurance" | "home" | "giving" | "social"

/** The cards, in the order the page lists them, each with the profile items it holds. */
export const GROUPS: readonly { key: GroupKey; title: string; items: readonly string[] }[] = [
	{ key: "filing", title: "Filing status", items: ["filingStatus"] },
	{
		key: "family",
		title: "Family",
		items: ["children", "childrenAtHigherRate", "parents", "disabledCare"],
	},
	{
		key: "insurance",
		title: "Insurance",
		items: ["lifeInsurance", "healthInsurance", "parentHealthInsurance", "spouseLifeInsurance"],
	},
	{ key: "home", title: "Home", items: ["mortgageInterest"] },
	{ key: "giving", title: "Giving", items: ["donation2x", "donation1x"] },
	{ key: "social", title: "Social security", items: ["socialSecurity"] },
]

/**
 * Where each class goes. The two retirement classes are not flags: the Levy reads them from contribution Flows that carry a
 * label, so they sit with those Flows and not in a card.
 */
export const PLACE: Readonly<Record<TaxClass, GroupKey | "flows">> = {
	children: "family",
	parents: "family",
	disabledCare: "family",
	socialSecurity: "social",
	lifeInsurance: "insurance",
	healthInsurance: "insurance",
	parentHealthInsurance: "insurance",
	spouseLifeInsurance: "insurance",
	mortgageInterest: "home",
	donation2x: "giving",
	donation1x: "giving",
	retirementContributions: "flows",
	thaiEsg: "flows",
}

/** One card: its title, and each item of the group as the page shows the profile. */
export interface GroupCard {
	readonly key: GroupKey
	readonly title: string
	readonly rows: readonly ProfileRow[]
}

/** The cards of a stored profile: the same rows the page showed in one list, split by group. */
export function groupCards(profile: TaxProfile): GroupCard[] {
	const rows = profileRows(profile)
	return GROUPS.map(({ key, title, items }) => ({
		key,
		title,
		rows: rows.filter((row) => items.includes(row.key)),
	}))
}
