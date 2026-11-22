/**
 * The household document with one person or one anchor put in or taken out. Each returns the whole
 * household, which the Edit saves as one `traj scenario household` write. A new household starts with
 * its first person and no anchors.
 */
import type { HouseholdAnchor, HouseholdDocument, HouseholdPerson } from "../../contract"

/** The household with one person put in, replaced where its id is held, or appended. */
export function householdWithPerson(
	household: HouseholdDocument | null,
	person: HouseholdPerson,
): HouseholdDocument {
	const current = household ?? { schemaVersion: 1 as const, people: [], anchors: [] }
	const people = current.people.some((existing) => existing.id === person.id)
		? current.people.map((existing) => (existing.id === person.id ? person : existing))
		: [...current.people, person]
	return { ...current, people }
}

/** The household without the person of that id. Its anchors are kept, so `traj` refuses one that names a removed person. */
export function householdWithoutPerson(
	household: HouseholdDocument,
	id: string,
): HouseholdDocument {
	return { ...household, people: household.people.filter((person) => person.id !== id) }
}

/** The household with one anchor put in, replacing the one that pins the same path. */
export function householdWithAnchor(
	household: HouseholdDocument,
	anchor: HouseholdAnchor,
): HouseholdDocument {
	const anchors = household.anchors.filter((existing) => existing.path !== anchor.path)
	return { ...household, anchors: [...anchors, anchor] }
}

/** The household without the anchor of that path: the dates it pinned stay as they are. */
export function householdWithoutAnchor(
	household: HouseholdDocument,
	path: string,
): HouseholdDocument {
	return { ...household, anchors: household.anchors.filter((anchor) => anchor.path !== path) }
}
