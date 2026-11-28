/**
 * The person a person form saves. Every check is a shape check: `traj` decides whether the household is valid, and its
 * refusal is shown at the field it names. The form invents no fact about a person: a blank role, birth month, life
 * expectancy or relation stays a problem.
 */
import type { HouseholdPerson } from "../../contract"
import { slugId, uniqueId } from "../plan-items/form"
import { labelOf, labelProblem } from "../plan-items/label-text"
import type { Problems } from "../plan-items/problems"
import type { PersonDraft } from "./person-draft"

const MONTH_TEXT = /^\d{4}-(0[1-9]|1[0-2])$/
const ROLES: readonly string[] = ["holder", "partner", "dependent"]
const WHOLE_TEXT = /^\d{1,15}$/

/** The relations a dependent may have to the account holder (cli ADR-0048). */
export const RELATIONS = ["child", "parent", "other"] as const
export type Relation = (typeof RELATIONS)[number]

/** The result of a person form: the person to save, or the problems the form shows at its fields. */
export type PersonResult = { ok: true; person: HouseholdPerson } | { ok: false; problems: Problems }

/** Whether the text is one of the relations `traj` takes. */
export function relationOf(text: string): Relation | null {
	return RELATIONS.find((known) => known === text) ?? null
}

/** The problems a person draft has at its fields, which are shape checks only. */
function personProblems(draft: PersonDraft, isNew: boolean): Map<string, string> {
	const problems = new Map<string, string>()
	if (isNew && slugId(draft.name) === "") problems.set("name", "Enter a name for the person.")
	if (!ROLES.includes(draft.role)) problems.set("role", "Choose the person's role.")
	if (!MONTH_TEXT.test(draft.born.trim())) problems.set("born", "Enter the birth month as YYYY-MM.")
	if (!WHOLE_TEXT.test(draft.lifeExpectancy.trim())) {
		problems.set("lifeExpectancy", "Enter the age at which life ends, as a whole number.")
	}
	const joins = draft.joins.trim()
	if (draft.role === "partner" && joins !== "" && !MONTH_TEXT.test(joins)) {
		problems.set("joins", "Enter the month the partner joins as YYYY-MM, or leave it empty.")
	}
	const label = labelProblem(draft.displayLabel)
	if (label !== null) problems.set("displayLabel", label)
	return problems
}

/** The person a draft names, with the fields its role takes; null when a dependent has no relation. */
function personOf(draft: PersonDraft, id: string): HouseholdPerson | null {
	const base = { id, born: draft.born.trim(), lifeExpectancy: Number(draft.lifeExpectancy.trim()) }
	const label = labelOf(draft.displayLabel)
	const named = label === null ? base : { ...base, displayLabel: label }
	const joins = draft.joins.trim()
	if (draft.role === "holder") return { ...named, role: "holder" }
	if (draft.role === "partner") {
		return { ...named, role: "partner", ...(joins === "" ? {} : { joins }) }
	}
	const relation = relationOf(draft.relation)
	return relation === null ? null : { ...named, role: "dependent", relation }
}

/**
 * The person a draft names. A new person's id is made from the name typed, and an existing one keeps
 * its id. A dependent without a relation is a problem at the relation field.
 */
export function personFromDraft(
	draft: PersonDraft,
	options: { existing?: { readonly id: string } | undefined; taken: readonly string[] },
): PersonResult {
	const problems = personProblems(draft, options.existing === undefined)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const id = options.existing?.id ?? uniqueId(slugId(draft.name), options.taken)
	const person = personOf(draft, id)
	if (person === null) {
		return {
			ok: false,
			problems: { relation: "Choose how the dependent relates to the account holder." },
		}
	}
	return { ok: true, person }
}
