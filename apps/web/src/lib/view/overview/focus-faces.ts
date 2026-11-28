import type { HouseholdDocument, PersonAge } from "../../contract"
import type { PersonNames } from "../item-names"
import type { FocusFace } from "./focus-types"

/** The holder and the partner, each named by the lookup's words and aged by the read that stated it. */
export function facesOf(
	ages: readonly PersonAge[],
	household: HouseholdDocument | null,
	people: PersonNames,
): FocusFace[] {
	const roles = new Map((household?.people ?? []).map((person) => [person.id, person.role]))
	return ages.flatMap((entry) => {
		const role = roles.get(entry.person)
		if (role !== "holder" && role !== "partner") return []
		const name = people.get(entry.person)?.label ?? entry.person
		return [{ name, initial: Array.from(name)[0] ?? "", age: entry.age, role }]
	})
}
