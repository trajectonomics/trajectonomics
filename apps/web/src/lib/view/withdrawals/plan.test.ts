import { describe, expect, test } from "bun:test"
import { type HouseholdDocument, type ScenarioDocument, scenarioDocument } from "../../contract"
import { type ItemNames, itemNames } from "../item-names"
import { anchorRefusal } from "./plan"

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [{ path: "flows.retirement-spending.start", person: "me", age: 60 }],
}

/** A household that pins the Flow's end instead, which the withdrawal form cannot write. */
const END_HOUSEHOLD: HouseholdDocument = {
	...HOUSEHOLD,
	anchors: [{ path: "flows.retirement-spending.end", person: "me", age: 70 }],
}

/** The plan's names for the Flows `labels` lists: each id, and the label it states when it has one. */
function namesOf(labels: readonly { id: string; displayLabel?: string }[]): ItemNames {
	const document: ScenarioDocument = scenarioDocument.parse({
		currency: "THB",
		accounts: [],
		flows: labels.map(({ id, displayLabel }) => ({
			id,
			kind: "expense",
			frequency: "monthly",
			start: "2026-01-01",
			...(displayLabel === undefined ? {} : { displayLabel }),
		})),
	})
	return itemNames(new Map(), null, document)
}

/** The note a try of the spending Flow earns: its edited self has no `start`, which the household pins. */
function note(names: ItemNames): string | null {
	return anchorRefusal(
		HOUSEHOLD,
		{ stored: undefined, edited: { id: "retirement-spending" } },
		names,
	)
}

describe("the note that refuses a try over an anchored date", () => {
	test("names a labelled Flow by its label", () => {
		const names = namesOf([{ id: "retirement-spending", displayLabel: "Retirement spending" }])
		expect(note(names)).toBe(
			"Your household sets when Retirement spending starts (at you, age 60), and this change leaves that date out. Save it to have the household fill the date in, or keep a start date in the form.",
		)
	})

	test("shows an unlabelled Flow's id, and adds the id when two Flows share a label", () => {
		expect(note(namesOf([{ id: "retirement-spending" }]))).toContain(
			"Your household sets when retirement-spending starts",
		)
		const twins = namesOf([
			{ id: "retirement-spending", displayLabel: "Retirement spending" },
			{ id: "other-spending", displayLabel: "Retirement spending" },
		])
		expect(note(twins)).toContain(
			"Your household sets when Retirement spending (retirement-spending) starts",
		)
	})

	test("for an end date, asks only for the save, because the form has no end-date field", () => {
		const names = namesOf([{ id: "retirement-spending", displayLabel: "Retirement spending" }])
		const note = anchorRefusal(
			END_HOUSEHOLD,
			{ stored: undefined, edited: { id: "retirement-spending" } },
			names,
		)
		expect(note).toBe(
			"Your household sets when Retirement spending ends (at you, age 70), and this change leaves that date out. Save it to have the household fill the date in.",
		)
		expect(note).not.toContain("end date in the form")
	})

	test("has no note when the Flow keeps the date, or the household pins none", () => {
		const names = namesOf([{ id: "retirement-spending", displayLabel: "Retirement spending" }])
		const kept = { stored: undefined, edited: { id: "retirement-spending", start: "2045-01-01" } }
		expect(anchorRefusal(HOUSEHOLD, kept, names)).toBeNull()
		expect(anchorRefusal(null, kept, names)).toBeNull()
	})
})
