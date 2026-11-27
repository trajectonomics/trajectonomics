/**
 * The household step: the people a guided plan starts with, the drafts their fields hold, and the problems the
 * person form finds. A holder is required, because the stop-work age is theirs
 * ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)). Pure.
 */
import type { HouseholdPerson } from "../../contract"
import { type PersonDraft, personDraftOf } from "../household/person-draft"
import { personFromDraft } from "../household/person-save"
import { slugId } from "../plan-items/form"

/** One problem, at the person whose field it is; `index` is -1 for the household as a whole. */
export interface PersonProblem {
	readonly index: number
	readonly field: string
	readonly problem: string
}

/** What the household comes to: the people, their problems, and the holder the stop-work age belongs to. */
export interface PeopleResult {
	readonly people: readonly HouseholdPerson[]
	readonly problems: readonly PersonProblem[]
	readonly holder: string
	readonly holderLifeExpectancy: number | null
}

/** The problem when no person is the account holder. */
export const HOLDER_REQUIRED = "Keep one person as the account holder."

/** The starting people: the main plan's household, or one empty holder. A person with no label starts on their id. */
export function startingPeople(household: readonly HouseholdPerson[] | undefined): PersonDraft[] {
	if (household === undefined || household.length === 0) return [personDraftOf(undefined, "holder")]
	return household.map((person) => {
		const draft = personDraftOf(person, person.role)
		return { ...draft, displayLabel: draft.displayLabel === "" ? draft.name : draft.displayLabel }
	})
}

/** A blank person in the role an "Add partner" or "Add dependent" button names. */
export function blankPerson(role: string): PersonDraft {
	return personDraftOf(undefined, role)
}

/** The name a person is typed, which also moves their id with it. */
export function nameChange(name: string): Partial<PersonDraft> {
	return { displayLabel: name, name: slugId(name) }
}

/** The household the drafts make, its problems, and its holder. */
export function peopleOf(drafts: readonly PersonDraft[]): PeopleResult {
	const problems: PersonProblem[] = []
	const people: HouseholdPerson[] = []
	const taken: string[] = []
	for (const [index, draft] of drafts.entries()) {
		const built = personFromDraft(draft, { taken })
		if (built.ok) {
			people.push(built.person)
			taken.push(built.person.id)
			continue
		}
		for (const [field, problem] of Object.entries(built.problems)) {
			problems.push({ index, field, problem })
		}
	}
	if (!drafts.some((draft) => draft.role === "holder")) {
		problems.push({ index: -1, field: "people", problem: HOLDER_REQUIRED })
	}
	const holder = people.find((person) => person.role === "holder")
	return {
		people,
		problems,
		holder: holder?.id ?? "",
		holderLifeExpectancy: holder?.lifeExpectancy ?? null,
	}
}
