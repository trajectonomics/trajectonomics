/**
 * The household as the page shows it. Every figure is the stored household's text, or the CLI's age on
 * a row: the page computes no age and no date (cli ADR-0048). A label names the anchor the household
 * holds; it never works out what the anchor's date is.
 */
import type { HouseholdAnchor, HouseholdDocument, HouseholdPerson, PersonAge } from "../../contract"
import { withSearch } from "../links"

/** One person as a row of the card: every field is the stored text. */
export interface PersonCard {
	readonly id: string
	readonly role: string
	readonly born: string
	readonly lifeExpectancy: string
	/** The month a partner joins, or null when the person is in the plan from the start. */
	readonly joins: string | null
}

/** A person's role as the card reads it. */
export function roleText(person: HouseholdPerson): string {
	if (person.role === "holder") return "Account holder"
	if (person.role === "partner") return "Partner"
	return `Dependent, ${person.relation}`
}

/** The people of a household, in the order it holds them. Empty without a household. */
export function personCards(household: HouseholdDocument | null): PersonCard[] {
	return (household?.people ?? []).map((person) => ({
		id: person.id,
		role: roleText(person),
		born: person.born,
		lifeExpectancy: String(person.lifeExpectancy),
		joins: person.role === "partner" ? (person.joins ?? null) : null,
	}))
}

/** What an anchor pins the date to, as the label reads it: "age 60", "life end" or "joining". */
export function anchorWhen(anchor: HouseholdAnchor): string {
	if ("age" in anchor) return `age ${anchor.age}`
	return anchor.at === "lifeEnd" ? "life end" : "joining"
}

/** An anchor as its label beside a date: "at me, age 60", "at me, life end" or "at partner, joining". */
export function anchorLabel(anchor: HouseholdAnchor): string {
	return `at ${anchor.person}, ${anchorWhen(anchor)}`
}

/** The anchor the household holds for a dotted path, or null when the path is not anchored. */
export function anchorAt(
	household: HouseholdDocument | null,
	path: string,
): HouseholdAnchor | null {
	return household?.anchors.find((anchor) => anchor.path === path) ?? null
}

/** The dotted path of a Flow's start or end, as the household names it: `flows.salary.end`. */
export function flowDatePath(flowId: string, edge: "start" | "end"): string {
	return `flows.${flowId}.${edge}`
}

/** The labels of one Flow's start and end: each the anchor's label, or null when the date is not anchored. */
export function flowAnchorLabels(
	household: HouseholdDocument | null,
	flowId: string,
): { start: string | null; end: string | null } {
	const label = (edge: "start" | "end") => {
		const anchor = anchorAt(household, flowDatePath(flowId, edge))
		return anchor === null ? null : anchorLabel(anchor)
	}
	return { start: label("start"), end: label("end") }
}

/** The ages a row carries, as one line of text: "me 60, partner 58". Empty when the row carries none. */
export function agesText(ages: readonly PersonAge[]): string {
	return ages.map((entry) => `${entry.person} ${entry.age}`).join(", ")
}

/** The link to the household card on the Overview, for the Scenario it belongs to. Keeps the other parameters. */
export function householdHref(scenario: string, search: string): string {
	const params = new URLSearchParams(search)
	params.set("scenario", scenario)
	return withSearch("/projection/", params.toString()).concat("#household")
}
