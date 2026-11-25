/**
 * The text of a person form: what the fields hold, read back from the person being edited. The person it saves is
 * `person-save.ts`, because a person form is both.
 */
import type { HouseholdPerson } from "../../contract"

/** The text of the person form. `relation` applies to a dependent, and `joins` to a partner. */
export interface PersonDraft {
	readonly name: string
	/** The name a page reads in place of the id, free text: empty for none (sim ADR 0032). */
	readonly displayLabel: string
	/** "holder", "partner" or "dependent": text, so a select can bind it. */
	readonly role: string
	/** One of the relations `traj` takes, or empty until the person chooses one. */
	readonly relation: string
	readonly born: string
	readonly lifeExpectancy: string
	readonly joins: string
}

/** The draft of a person to edit, or of a new one in the role the household needs next. */
export function personDraftOf(person: HouseholdPerson | undefined, role: string): PersonDraft {
	return {
		name: person?.id ?? "",
		displayLabel: person?.displayLabel ?? "",
		role: person?.role ?? role,
		relation: person?.role === "dependent" ? person.relation : "",
		born: person?.born ?? "",
		lifeExpectancy: person === undefined ? "" : String(person.lifeExpectancy),
		joins: person?.role === "partner" ? (person.joins ?? "") : "",
	}
}
