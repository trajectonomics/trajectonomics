/**
 * The household step: the people a guided plan starts with, the drafts their fields hold, and the problems the
 * person form finds. A holder is required, because the stop-work age is theirs
 * ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)). Pure.
 */
import type { HouseholdPerson } from "../../contract"
import { type PersonDraft, personDraftOf } from "../household/person-draft"
import { personFromDraft } from "../household/person-save"

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

/**
 * The starting people: the main plan's household, or one empty holder. A person keeps the label the household
 * states, and an unlabelled one keeps an empty label: the page never turns their id into a name (ADR 0029).
 */
export function startingPeople(household: readonly HouseholdPerson[] | undefined): PersonDraft[] {
	if (household === undefined || household.length === 0) return [personDraftOf(undefined, "holder")]
	return household.map((person) => personDraftOf(person, person.role))
}

/** The words the role gives a person with no label: the household card's own fallback. */
function roleWords(person: PersonDraft): string {
	if (person.role === "holder") return "You"
	return person.role === "partner" ? "Your partner" : "Dependent"
}

/** How the page calls a person: their typed label, their id, or the role words. Never a name made from the id. */
export function personWords(person: PersonDraft): string {
	const named = person.displayLabel.trim() || person.name.trim()
	return named === "" ? roleWords(person) : named
}

/** A blank person in the role an "Add partner" or "Add dependent" button names. */
export function blankPerson(role: string): PersonDraft {
	return personDraftOf(undefined, role)
}

/**
 * One durable key per starting person, so a Remove never hands another person's answers to their fields: the id
 * the read stated, or the person's place when the read stated none. A label typed later never moves the key.
 */
export function startingKeys(people: readonly PersonDraft[]): string[] {
	return people.map((person, index) =>
		person.name === "" ? `seed-index-${index}` : `seed-id-${person.name}`,
	)
}

/** The name a person is typed: the label only, so a seeded person keeps its id exactly (ADR 0029). */
export function nameChange(name: string): Partial<PersonDraft> {
	return { displayLabel: name }
}

/** One draft as it is saved: a seeded person keeps the id the read stated, and a new one takes an id from its label. */
function builtOf(draft: PersonDraft, taken: readonly string[]) {
	const existing = draft.name.trim() === "" ? undefined : { id: draft.name }
	return personFromDraft(existing === undefined ? { ...draft, name: draft.displayLabel } : draft, {
		existing,
		taken,
	})
}

/** One draft's problems at its person's fields, as the household lists them. */
function addProblems(
	problems: PersonProblem[],
	index: number,
	found: Record<string, string>,
): void {
	for (const [field, problem] of Object.entries(found)) problems.push({ index, field, problem })
}

/** The people the drafts save, and the problems at their fields. */
function collectedOf(drafts: readonly PersonDraft[]): {
	people: HouseholdPerson[]
	problems: PersonProblem[]
} {
	const people: HouseholdPerson[] = []
	const problems: PersonProblem[] = []
	const taken: string[] = []
	for (const [index, draft] of drafts.entries()) {
		// A seeded person keeps the id the read stated; a new one takes an id from the name typed.
		const built = builtOf(draft, taken)
		if (built.ok) {
			people.push(built.person)
			taken.push(built.person.id)
		} else addProblems(problems, index, built.problems)
	}
	return { people, problems }
}

/** The household the drafts make, its problems, and its holder. */
export function peopleOf(drafts: readonly PersonDraft[]): PeopleResult {
	const { people, problems } = collectedOf(drafts)
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
