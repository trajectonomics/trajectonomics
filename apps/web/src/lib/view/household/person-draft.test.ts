import { describe, expect, test } from "bun:test"
import type { HouseholdPerson } from "../../contract"
import { type PersonDraft, personDraftOf, personFromDraft } from "./person-draft"

const holder: HouseholdPerson = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }

const draft = (change: Partial<PersonDraft> = {}): PersonDraft => ({
	name: "Partner",
	label: "",
	role: "partner",
	relation: "",
	born: "1992-02",
	lifeExpectancy: "88",
	joins: "2028-01",
	...change,
})

describe("personFromDraft", () => {
	test("saves the display label trimmed, and leaves it out when the field is empty", () => {
		const labelled = personFromDraft(draft({ label: "  Somchai  " }), { taken: ["me"] })
		expect(labelled.ok && labelled.person.displayLabel).toBe("Somchai")
		const bare = personFromDraft(draft(), { taken: ["me"] })
		expect(bare.ok && bare.person).not.toHaveProperty("displayLabel")
	})

	test("refuses a display label over 80 characters at its field", () => {
		const result = personFromDraft(draft({ label: "a".repeat(81) }), { taken: [] })
		expect(result.ok === false && result.problems["label"]).toContain("at most 80 characters")
	})

	test("a new partner takes an id from the name, and states the month they join", () => {
		expect(personFromDraft(draft(), { taken: ["me"] })).toEqual({
			ok: true,
			person: {
				id: "partner",
				role: "partner",
				born: "1992-02",
				lifeExpectancy: 88,
				joins: "2028-01",
			},
		})
	})

	test("a life expectancy left blank is a problem, never a default", () => {
		expect(personFromDraft(draft({ lifeExpectancy: "" }), { taken: [] })).toEqual({
			ok: false,
			problems: { lifeExpectancy: "Enter the age at which life ends, as a whole number." },
		})
	})

	test("a birth month must be YYYY-MM", () => {
		expect(personFromDraft(draft({ born: "1992-2" }), { taken: [] })).toMatchObject({
			ok: false,
			problems: { born: expect.any(String) },
		})
	})

	test("a role left blank is a problem, never a default", () => {
		const draft = {
			...personDraftOf(undefined, ""),
			name: "mali",
			born: "2027-09",
			lifeExpectancy: "90",
		}
		expect(draft.role).toBe("")
		const result = personFromDraft(draft, { taken: ["me"] })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.problems["role"]).toBe("Choose the person's role.")
	})

	test("a dependent without a chosen relation is a problem at the relation field", () => {
		expect(
			personFromDraft(draft({ role: "dependent", relation: "", joins: "" }), { taken: [] }),
		).toEqual({
			ok: false,
			problems: { relation: "Choose how the dependent relates to the account holder." },
		})
	})

	test("a dependent with a relation keeps it", () => {
		expect(
			personFromDraft(
				draft({ name: "Mali", role: "dependent", relation: "child", born: "2027-09", joins: "" }),
				{
					taken: [],
				},
			),
		).toEqual({
			ok: true,
			person: {
				id: "mali",
				role: "dependent",
				relation: "child",
				born: "2027-09",
				lifeExpectancy: 88,
			},
		})
	})

	test("an existing person keeps its id, whatever the name field says", () => {
		expect(
			personFromDraft(draft({ name: "Changed" }), { existing: holder, taken: ["me"] }),
		).toMatchObject({
			ok: true,
			person: { id: "me", role: "partner" },
		})
	})

	test("a new id does not repeat one the household holds", () => {
		expect(
			personFromDraft(draft({ name: "me", role: "holder", joins: "" }), { taken: ["me"] }),
		).toMatchObject({
			ok: true,
			person: { id: "me-2", role: "holder" },
		})
	})
})

describe("personDraftOf", () => {
	test("reads an existing person's own fields back, and starts a new one in the role given", () => {
		expect(personDraftOf(holder, "dependent")).toMatchObject({
			name: "me",
			role: "holder",
			lifeExpectancy: "90",
		})
		expect(personDraftOf(undefined, "holder")).toMatchObject({
			name: "",
			role: "holder",
			lifeExpectancy: "",
		})
	})
})
