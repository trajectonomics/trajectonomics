import { describe, expect, test } from "bun:test"
import type { HouseholdDocument } from "../../contract"
import {
	agesText,
	anchorAt,
	anchorLabel,
	axisAge,
	flowAnchorLabels,
	householdHref,
	personCards,
	roleText,
} from "./model"

const household: HouseholdDocument = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88, joins: "2028-01" },
		{ id: "mali", role: "dependent", relation: "child", born: "2027-09", lifeExpectancy: 90 },
	],
	anchors: [
		{ path: "flows.salary.end", person: "me", age: 60 },
		{ path: "flows.pension.end", person: "me", at: "lifeEnd" },
		{ path: "flows.partner-salary.start", person: "partner", at: "joins" },
	],
}

describe("personCards", () => {
	test("lists each person's role, birth month and life expectancy as the stored text", () => {
		expect(personCards(household)).toEqual([
			{ id: "me", role: "Account holder", born: "1990-06", lifeExpectancy: "90", joins: null },
			{
				id: "partner",
				role: "Partner",
				born: "1992-02",
				lifeExpectancy: "88",
				joins: "2028-01",
			},
			{ id: "mali", role: "Dependent, child", born: "2027-09", lifeExpectancy: "90", joins: null },
		])
	})

	test("is empty without a household", () => {
		expect(personCards(null)).toEqual([])
	})

	test("names a dependent's relation", () => {
		expect(
			roleText({
				id: "x",
				role: "dependent",
				relation: "parent",
				born: "1950-01",
				lifeExpectancy: 80,
			}),
		).toBe("Dependent, parent")
	})
})

describe("anchor labels", () => {
	test("an age, a life end and a joining each read as the household states it", () => {
		expect(anchorLabel({ path: "flows.salary.end", person: "me", age: 60 })).toBe("at me, age 60")
		expect(anchorLabel({ path: "flows.pension.end", person: "me", at: "lifeEnd" })).toBe(
			"at me, life end",
		)
		expect(
			anchorLabel({ path: "flows.partner-salary.start", person: "partner", at: "joins" }),
		).toBe("at partner, joining")
	})

	test("a flow's start and end carry the label of their own anchor, and no other", () => {
		expect(flowAnchorLabels(household, "salary")).toEqual({ start: null, end: "at me, age 60" })
		expect(flowAnchorLabels(household, "pension")).toEqual({
			start: null,
			end: "at me, life end",
		})
		expect(flowAnchorLabels(null, "salary")).toEqual({ start: null, end: null })
	})

	test("finds the anchor of a path, or none", () => {
		expect(anchorAt(household, "flows.salary.end")?.path).toBe("flows.salary.end")
		expect(anchorAt(household, "flows.salary.start")).toBeNull()
	})
})

describe("agesText", () => {
	test("lists each person's age on the row, in the household's order", () => {
		expect(
			agesText([
				{ person: "me", age: 60 },
				{ person: "partner", age: 58 },
			]),
		).toBe("me 60, partner 58")
	})

	test("is empty when the row carries no ages", () => {
		expect(agesText([])).toBe("")
	})
})

describe("axisAge", () => {
	test('reads "age N" for one person, the first person\'s age for several, and null for none', () => {
		expect(axisAge([{ person: "me", age: 37 }])).toBe("age 37")
		expect(
			axisAge([
				{ person: "me", age: 37 },
				{ person: "partner", age: 35 },
			]),
		).toBe("me 37")
		expect(axisAge([])).toBeNull()
	})
})

describe("householdHref", () => {
	test("names the Scenario and keeps the other parameters of the address", () => {
		expect(householdHref("base", "?demo=1")).toBe("/projection/?demo=1&scenario=base#household")
		expect(householdHref("early plan", "")).toBe("/projection/?scenario=early+plan#household")
	})
})
