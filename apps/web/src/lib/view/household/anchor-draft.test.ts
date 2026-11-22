import { describe, expect, test } from "bun:test"
import { type AnchorDraft, anchorDraftOf, anchorFromDraft } from "./anchor-draft"

const draftOf = (change: Partial<AnchorDraft> = {}): AnchorDraft => ({
	flow: "salary",
	edge: "end",
	person: "me",
	when: "age",
	age: "60",
	...change,
})

describe("anchorFromDraft", () => {
	test("an age anchor writes the Flow's path, the person and the whole age", () => {
		expect(anchorFromDraft(draftOf())).toEqual({
			ok: true,
			anchor: { path: "flows.salary.end", person: "me", age: 60 },
		})
	})

	test("life end and joining each write their own anchor, with no age", () => {
		expect(anchorFromDraft(draftOf({ when: "lifeEnd" }))).toEqual({
			ok: true,
			anchor: { path: "flows.salary.end", person: "me", at: "lifeEnd" },
		})
		expect(anchorFromDraft(draftOf({ when: "joins", edge: "start" }))).toEqual({
			ok: true,
			anchor: { path: "flows.salary.start", person: "me", at: "joins" },
		})
	})

	test("an age that is not whole is a problem at the age field", () => {
		expect(anchorFromDraft(draftOf({ age: "60.5" }))).toEqual({
			ok: false,
			problems: { age: "Enter the age in whole years." },
		})
	})

	test("nothing chosen is a problem at each field, and the form invents none of it", () => {
		expect(anchorFromDraft(anchorDraftOf())).toEqual({
			ok: false,
			problems: {
				flow: "Choose the item whose date is pinned.",
				edge: "Choose the start or the end of the item.",
				person: "Choose the person whose age pins the date.",
				age: "Enter the age in whole years.",
			},
		})
	})
})
