import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, HouseholdPerson } from "../../contract"
import {
	householdWithAnchor,
	householdWithoutAnchor,
	householdWithoutPerson,
	householdWithPerson,
} from "./document"

const holder: HouseholdPerson = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }
const base: HouseholdDocument = { schemaVersion: 1, people: [holder], anchors: [] }

describe("household documents", () => {
	test("a new household starts with its first person and no anchors", () => {
		expect(householdWithPerson(null, holder)).toEqual(base)
	})

	test("a person is replaced where its id is held, or appended", () => {
		const older = { ...holder, lifeExpectancy: 85 }
		expect(householdWithPerson(base, older).people).toEqual([older])
		const child: HouseholdPerson = {
			id: "mali",
			role: "dependent",
			relation: "child",
			born: "2027-09",
			lifeExpectancy: 90,
		}
		expect(householdWithPerson(base, child).people.map((person) => person.id)).toEqual([
			"me",
			"mali",
		])
	})

	test("removing a person keeps the anchors, so traj can refuse one that names them", () => {
		const withAnchor = householdWithAnchor(base, {
			path: "flows.salary.end",
			person: "me",
			age: 60,
		})
		expect(householdWithoutPerson(withAnchor, "me")).toEqual({
			schemaVersion: 1,
			people: [],
			anchors: withAnchor.anchors,
		})
	})

	test("an anchor replaces the one that pins the same path, and removing one keeps the others", () => {
		const first = householdWithAnchor(base, { path: "flows.salary.end", person: "me", age: 60 })
		const second = householdWithAnchor(first, { path: "flows.salary.end", person: "me", age: 65 })
		expect(second.anchors).toEqual([{ path: "flows.salary.end", person: "me", age: 65 }])
		expect(householdWithoutAnchor(second, "flows.salary.end").anchors).toEqual([])
	})
})
