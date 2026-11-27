import { describe, expect, test } from "bun:test"
import type { HouseholdPerson } from "../../contract"
import { blankPerson, nameChange, peopleOf, personWords, startingPeople } from "./people"

/** One person of a household, from an id and the fields this test leaves out. */
function person(id: string, over: Partial<HouseholdPerson> = {}): HouseholdPerson {
	return {
		id,
		born: "1990-06",
		lifeExpectancy: 90,
		role: "holder",
		...over,
	} as HouseholdPerson
}

describe("startingPeople", () => {
	test("leaves an unlabelled holder's label empty, and keeps the id the read stated", () => {
		const [holder] = startingPeople([person("me")])
		expect(holder?.name).toBe("me")
		expect(holder?.displayLabel).toBe("")
	})

	test("keeps a seeded id exactly, including its capitals", () => {
		const [holder] = startingPeople([person("Mali", { displayLabel: "Mali" })])
		expect(holder?.name).toBe("Mali")
		expect(holder?.displayLabel).toBe("Mali")
	})
})

describe("nameChange", () => {
	test("types the label only, so a seeded person keeps its id", () => {
		expect(nameChange("Mali")).toEqual({ displayLabel: "Mali" })
	})
})

describe("peopleOf", () => {
	test("saves a seeded id as it was, even when the label differs only by case", () => {
		const [holder] = startingPeople([person("Mali")])
		if (holder === undefined) throw new Error("the seeded holder")
		const typed = { ...holder, ...nameChange("mali") }
		const built = peopleOf([typed])
		expect(built.problems).toEqual([])
		expect(built.people[0]).toMatchObject({ id: "Mali", displayLabel: "mali" })
	})

	test("makes a new person's id from the name typed", () => {
		const partner = {
			...blankPerson("partner"),
			...nameChange("Ann Lee"),
			born: "1992-01",
			lifeExpectancy: "88",
		}
		const built = peopleOf([partner])
		expect(built.people[0]).toMatchObject({ id: "ann-lee", displayLabel: "Ann Lee" })
	})
})

describe("personWords", () => {
	test("names a person by their label, their id, or their role", () => {
		expect(personWords({ ...blankPerson("partner"), displayLabel: "Ann" })).toBe("Ann")
		expect(personWords({ ...blankPerson("partner"), name: "Mali" })).toBe("Mali")
		expect(personWords(blankPerson("partner"))).toBe("Your partner")
		expect(personWords(blankPerson("holder"))).toBe("You")
	})
})
