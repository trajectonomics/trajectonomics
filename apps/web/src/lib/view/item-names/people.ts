/**
 * The words that name a household's people. A person may state a `displayLabel` (sim ADR 0032), which wins; otherwise the
 * words come from the role the CLI states: "You", "Your partner", "Child". An id is never turned into a name.
 */
import type { HouseholdDocument, HouseholdPerson } from "../../contract"

/** How the page calls one person: the label for a heading or a list, and the same words in the middle of a sentence. */
export interface PersonName {
	readonly label: string
	readonly subject: string
}

/** The words for each person of a household, by id. */
export type PersonNames = ReadonlyMap<string, PersonName>

/** The names of a page that has no household: every person shows by id. */
export const NO_PEOPLE: PersonNames = new Map()

/** The words for a role: the holder is "You", the others are called by the role the CLI states. */
function roleWords(person: HouseholdPerson): PersonName {
	if (person.role === "holder") return { label: "You", subject: "you" }
	if (person.role === "partner") return { label: "Your partner", subject: "your partner" }
	const noun = person.relation === "other" ? "dependent" : person.relation
	return { label: `${noun.charAt(0).toUpperCase()}${noun.slice(1)}`, subject: `the ${noun}` }
}

/** The words for one person: the label the household states for them, else their role's. */
function wordsOf(person: HouseholdPerson): PersonName {
	const label = person.displayLabel
	if (label === undefined) return roleWords(person)
	// A label is what the person is called, so it is the same words in a heading and in a sentence.
	return { label, subject: label }
}

/**
 * The names of a household's people, by id. Two people who share a role (two children) take their id in brackets, so
 * a page can tell them apart. Empty without a household, and every person shows by id.
 */
export function personNames(household: HouseholdDocument | null): PersonNames {
	const people = household?.people ?? []
	const words = people.map(wordsOf)
	return new Map(
		people.map((person, at) => {
			const mine = words[at] ?? wordsOf(person)
			const twins = words.filter((other) => other.label === mine.label).length
			if (twins === 1) return [person.id, mine] as const
			return [
				person.id,
				{ label: `${mine.label} (${person.id})`, subject: `${mine.subject} (${person.id})` },
			] as const
		}),
	)
}

/** The words of a person by id, or the id itself for one the household does not name. */
export function personText(people: PersonNames, id: string): string {
	return people.get(id)?.label ?? id
}
