import { describe, expect, test } from "bun:test"
import type { HouseholdDocument } from "../../contract"
import { NO_PEOPLE, personNames } from "../item-names"
import {
	agesText,
	anchorAt,
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
	test("lists each person's role, birth month and life expectancy in the Dashboard's format", () => {
		expect(personCards(household)).toEqual([
			{ id: "me", role: "Account holder", born: "Jun 1990", lifeExpectancy: "90", joins: null },
			{
				id: "partner",
				role: "Partner",
				born: "Feb 1992",
				lifeExpectancy: "88",
				joins: "Jan 2028",
			},
			{ id: "mali", role: "Dependent, child", born: "Sep 2027", lifeExpectancy: "90", joins: null },
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
	test("a flow's start and end carry the label of their own anchor, and no other", () => {
		expect(flowAnchorLabels(household, "salary")).toEqual({ start: null, end: "at you, age 60" })
		expect(flowAnchorLabels(household, "pension")).toEqual({
			start: null,
			end: "at you, life end",
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
			agesText(
				[
					{ person: "me", age: 60 },
					{ person: "partner", age: 58 },
				],
				NO_PEOPLE,
			),
		).toBe("me 60, partner 58")
	})

	test("calls each person by the household's words, and one it does not name by id", () => {
		expect(
			agesText(
				[
					{ person: "me", age: 60 },
					{ person: "partner", age: 58 },
					{ person: "ghost", age: 4 },
				],
				personNames(household),
			),
		).toBe("You 60, Your partner 58, ghost 4")
	})

	test("is empty when the row carries no ages", () => {
		expect(agesText([], NO_PEOPLE)).toBe("")
	})
})

describe("axisAge", () => {
	test("reads the first person's age, and null for none", () => {
		expect(axisAge([{ person: "me", age: 37 }], NO_PEOPLE)).toBe("me 37")
		expect(
			axisAge(
				[
					{ person: "me", age: 37 },
					{ person: "partner", age: 35 },
				],
				NO_PEOPLE,
			),
		).toBe("me 37")
		expect(axisAge([], NO_PEOPLE)).toBeNull()
	})

	test("calls the first person by the household's words", () => {
		const ages = [
			{ person: "me", age: 37 },
			{ person: "partner", age: 35 },
		]
		expect(axisAge(ages, personNames(household))).toBe("You 37")
		expect(axisAge([{ person: "me", age: 37 }], personNames(household))).toBe("You 37")
	})
})

describe("householdHref", () => {
	test("names the Scenario and keeps the other parameters of the address", () => {
		expect(householdHref("base", "?demo=1")).toBe("/household/?demo=1&scenario=base")
		expect(householdHref("early plan", "")).toBe("/household/?scenario=early+plan")
	})
})
