import { thFilerLabel } from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../../errors"
import type { Household, Person } from "../household/model"

/** The refusal listing each taxed item that has no Owner, the way an unlabelled income Flow is refused. */
export function ownerless(status: string, items: readonly string[]): AppError {
	return fail("invalid_input", {
		path: "document",
		message: `With --filing-status ${status} and Owners in the household, every taxed Flow and Account needs an Owner; ${
			items.length === 1 ? "one item has" : `${items.length} items have`
		} none, so tax could not say whose income it is.`,
		hint: 'Add each item to "owners" in the household, as {"path": "flows.<id>", "person": "<person id>"} or "shared", then run "traj scenario household" again.',
		details: { items },
	})
}

/** The refusal for a person whose id cannot be a Filer label's suffix. */
function unfit(status: string, person: Person, index: number): AppError {
	return fail("invalid_input", {
		path: "filingStatus",
		message: `--filing-status ${status} needs each Filer's id to be 1 to 32 lowercase letters, digits or hyphens, and people.${index}.id "${person.id}" is not.`,
		hint: 'Rename the person with "traj scenario household" (an id such as "me" or "partner"), then write the tax again.',
		details: { field: `people.${index}.id`, person: person.id },
	})
}

/** The first Filer id tax refuses as a label's suffix, or null when every one fits. */
export function unfitFiler(
	household: Household,
	status: string,
	filers: readonly string[],
): AppError | null {
	for (const id of filers) {
		try {
			thFilerLabel("x", id)
		} catch {
			const index = household.people.findIndex((person) => person.id === id)
			return unfit(status, household.people[index] as Person, index)
		}
	}
	return null
}
