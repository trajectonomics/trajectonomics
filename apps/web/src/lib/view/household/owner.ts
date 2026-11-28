/**
 * Whose a Flow is: the household's `owners` entry at `flows.<id>` (cli ADR-0076). A couple's tax reads each person's income by
 * that Owner, so the Income form states it. A dependent owns nothing, which `traj` refuses, so none is offered. Pure.
 */
import type { HouseholdDocument } from "../../contract"
import { joinPath, splitPath } from "../document-path"
import { personNames } from "../item-names"
import type { Choice } from "../plan-items/options"

/** The Owner the CLI states for both partners at once. */
export const SHARED = "shared"

type Owner = NonNullable<HouseholdDocument["owners"]>[number]

/** Whether an Owner entry names this Flow. Paths are compared by their segments, so an escaped id matches. */
function names(owner: Owner, flowId: string): boolean {
	const [section, id, ...rest] = splitPath(owner.path)
	return section === "flows" && id === flowId && rest.length === 0
}

/** Whether the household states any Owner, which is when the Income form asks for one. */
export function hasOwners(household: HouseholdDocument | null): household is HouseholdDocument {
	return (household?.owners?.length ?? 0) > 0
}

/** The Owner of a Flow as the household states it, or "" for none. */
export function flowOwner(household: HouseholdDocument | null, flowId: string): string {
	return household?.owners?.find((owner) => names(owner, flowId))?.person ?? ""
}

/**
 * The choices of the Owner select: nothing, the two partners by their names, and both only when the Flow already holds it.
 * Undefined where the household states no Owner, so the form shows no such field.
 */
export function ownerChoices(
	household: HouseholdDocument | null,
	held: string,
): Choice[] | undefined {
	if (!hasOwners(household)) return undefined
	const words = personNames(household)
	const people = household.people
		.filter((person) => person.role !== "dependent")
		.map((person) => ({ value: person.id, label: words.get(person.id)?.label ?? person.id }))
	const both = held === SHARED ? [{ value: SHARED, label: "Both partners" }] : []
	return [{ value: "", label: "Choose" }, ...people, ...both]
}

/** The household with one Flow's Owner set, or taken out for "". Every other Owner stays. */
export function householdWithOwner(
	household: HouseholdDocument,
	flowId: string,
	person: string,
): HouseholdDocument {
	const others = (household.owners ?? []).filter((owner) => !names(owner, flowId))
	const mine = person === "" ? [] : [{ path: joinPath(["flows", flowId]), person }]
	return { ...household, schemaVersion: 2, owners: [...others, ...mine] }
}
