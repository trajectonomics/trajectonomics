import { canonicalJson } from "../../store/canonical"
import { ageDate, joinsDate } from "./dates"

/**
 * The household's model (cli ADR-0048): people, anchors and Owners, as the rules and both resolvers read
 * them. Declared by hand so the exported types never depend on unexported schema constants.
 */

type PersonBase = { id: string; born: string; lifeExpectancy: number }

export type Person =
	| (PersonBase & { role: "holder" })
	| (PersonBase & { role: "partner"; joins?: string | undefined })
	| (PersonBase & { role: "dependent"; relation: "child" | "parent" | "other" })

/** An anchor pins one dotted path to an age of its person, or to life's end or a partner's join. */
export type Anchor = { path: string; person: string } & (
	| { age: number }
	| { at: "lifeEnd" | "joins" }
)

/** The value of an Owner that belongs to both partners (cli ADR-0076). Reserved from schema version 2. */
export const SHARED = "shared"

/** An Owner: the person, or `shared`, whose Flow or Account the path names (cli ADR-0076). */
export type Owner = { path: string; person: string }

/**
 * A household. Version 1 states people and anchors; version 2 adds `owners`, which version 1 does
 * not carry, so a version 1 household reads as one with no Owners and its stored bytes never change
 * (cli ADR-0076).
 */
export type Household = {
	schemaVersion: 1 | 2
	people: Person[]
	anchors: Anchor[]
	owners?: Owner[] | undefined
}

export function byId(people: readonly Person[]): Map<string, Person> {
	return new Map(people.map((entry) => [entry.id, entry]))
}

/** The date an anchor resolves to for its person, or null when that is outside 0001-9998. */
export function anchorDate(people: readonly Person[], entry: Anchor): string | null {
	const who = byId(people).get(entry.person)
	if (who === undefined) return null
	if ("age" in entry) return ageDate(who.born, entry.age)
	if (entry.at === "lifeEnd") return ageDate(who.born, who.lifeExpectancy)
	return who.role === "partner" && who.joins !== undefined ? joinsDate(who.joins) : null
}

/** The stored form: RFC 8785 canonical text, as every Scenario row keeps its document. */
export function canonicalHousehold(household: Household): string {
	return canonicalJson(household, "document")
}
